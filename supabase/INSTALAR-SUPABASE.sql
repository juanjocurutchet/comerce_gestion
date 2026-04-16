-- =============================================================================
-- INSTALACIÓN ÚNICA EN SUPABASE (SQL Editor → pegar todo → Run)
-- =============================================================================
-- Este archivo NO se ejecuta solo: Supabase está en TU cuenta en la nube.
-- Nosotros solo guardamos el SQL en el proyecto; vos lo copiás y ejecutás una vez.
--
-- Qué hace:
--   1) Tabla licencias (solo si no existe) + permisos para la app con anon key
--   2) Multi-tenant: commerces, user_commerces, productos + RLS
--   3) Tabla upgrade_requests (formulario “pasar a plan pago”) + RLS
--
-- Si ya tenés licencias creada a mano, el paso 1 no la modifica (IF NOT EXISTS).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Licencias (activación / demo; lectura con clave anónima)
-- ---------------------------------------------------------------------------
create table if not exists public.licencias (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  clave text not null unique,
  vence_en date not null,
  grace_days integer not null default 15,
  notas text,
  activo boolean not null default true,
  features jsonb,
  last_check timestamptz,
  created_at timestamptz not null default now(),
  es_demo boolean not null default false,
  commerce_id text
);

comment on table public.licencias is 'Claves de activación y vencimiento; la app lee por clave con la anon key.';
comment on column public.licencias.es_demo is 'true = demo/prueba; uso operativo del panel admin.';
comment on column public.licencias.commerce_id is 'Opcional: id en public.commerces para alinear sync multi-tenant.';

-- Instalaciones anteriores sin estas columnas:
alter table public.licencias add column if not exists es_demo boolean not null default false;
alter table public.licencias add column if not exists commerce_id text;

-- La app (PWA / escritorio) consulta licencias con la anon key: hace falta SELECT.
grant usage on schema public to anon, authenticated;
grant select on public.licencias to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Multi-tenant (sync productos, user_commerces, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.commerces (
  id text primary key,
  nombre text not null,
  activo boolean not null default true,
  plan text default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_commerces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commerce_id text not null references public.commerces(id) on delete cascade,
  role text not null default 'owner',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, commerce_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_commerces_updated_at on public.commerces;
create trigger trg_commerces_updated_at
before update on public.commerces
for each row
execute function public.set_updated_at();

create or replace function public.user_belongs_to_commerce(target_commerce_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_commerces uc
    where uc.user_id = auth.uid()
      and uc.commerce_id = target_commerce_id
      and uc.activo = true
  );
$$;

create or replace function public.user_has_commerce_role(target_commerce_id text, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_commerces uc
    where uc.user_id = auth.uid()
      and uc.commerce_id = target_commerce_id
      and uc.activo = true
      and uc.role = any(allowed_roles)
  );
$$;

create table if not exists public.productos (
  id bigint not null,
  commerce_id text not null references public.commerces(id) on delete restrict,
  sync_id text,
  codigo text,
  nombre text not null,
  descripcion text,
  categoria_id bigint,
  proveedor_id bigint,
  precio_compra numeric(14,2) not null default 0,
  precio_venta numeric(14,2) not null default 0,
  stock_actual numeric(14,3) not null default 0,
  stock_minimo numeric(14,3) not null default 0,
  unidad text default 'unidad',
  fecha_vencimiento text,
  dias_alerta_vencimiento integer default 7,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (commerce_id, id)
);

create unique index if not exists productos_sync_id_idx
  on public.productos (sync_id)
  where sync_id is not null;

create index if not exists productos_commerce_updated_idx
  on public.productos (commerce_id, updated_at desc);

create index if not exists productos_commerce_codigo_idx
  on public.productos (commerce_id, codigo);

drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
before update on public.productos
for each row
execute function public.set_updated_at();

alter table public.commerces enable row level security;
alter table public.user_commerces enable row level security;
alter table public.productos enable row level security;

drop policy if exists commerces_select_own on public.commerces;
create policy commerces_select_own
on public.commerces
for select
using (public.user_belongs_to_commerce(id));

drop policy if exists user_commerces_select_self on public.user_commerces;
create policy user_commerces_select_self
on public.user_commerces
for select
using (user_id = auth.uid());

drop policy if exists productos_select_own on public.productos;
create policy productos_select_own
on public.productos
for select
using (public.user_belongs_to_commerce(commerce_id));

drop policy if exists productos_insert_admin on public.productos;
create policy productos_insert_admin
on public.productos
for insert
with check (public.user_has_commerce_role(commerce_id, array['owner', 'admin']));

drop policy if exists productos_update_admin on public.productos;
create policy productos_update_admin
on public.productos
for update
using (public.user_has_commerce_role(commerce_id, array['owner', 'admin']))
with check (public.user_has_commerce_role(commerce_id, array['owner', 'admin']));

drop policy if exists productos_delete_owner on public.productos;
create policy productos_delete_owner
on public.productos
for delete
using (public.user_has_commerce_role(commerce_id, array['owner']));

comment on table public.commerces is 'Comercios/tenants de la plataforma.';
comment on table public.user_commerces is 'Relación entre usuarios autenticados y comercios habilitados.';
comment on table public.productos is 'Tabla remota multi-tenant para sincronización de productos.';

-- ---------------------------------------------------------------------------
-- 3) Solicitudes de upgrade (modal demo / plan pago)
-- ---------------------------------------------------------------------------
create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  commerce_size text not null default '',
  current_days_left integer,
  source text not null default 'unknown',
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.upgrade_requests is 'Leads / solicitudes de paso a plan pago desde la app.';

alter table public.upgrade_requests enable row level security;

drop policy if exists upgrade_requests_insert_public on public.upgrade_requests;
create policy upgrade_requests_insert_public
  on public.upgrade_requests
  for insert
  to anon, authenticated
  with check (
    length(trim(client_name)) > 0
    and length(trim(contact_name)) > 0
    and length(trim(contact_email)) > 0
    and source in ('pwa', 'desktop')
  );

-- Fin: revisá en Database → Tables que aparezcan licencias, commerces, user_commerces, productos, upgrade_requests.
