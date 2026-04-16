-- Primer esquema remoto para sync de productos.
-- Importante: este SQL sirve solo para pruebas internas y primeras validaciones.
-- Para producción multi-tenant usar `supabase/rls-multitenant-base.sql`.
-- En esta versión NO hay aislamiento seguro por usuario/tenant.

create table if not exists public.productos (
  id bigint not null,
  commerce_id text not null,
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
  created_at timestamptz default now(),
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

alter table public.productos replica identity full;

-- Etapa inicial: se desactiva RLS para poder sincronizar desde la PWA con la anon key.
-- No dejar así al escalar a clientes reales. El siguiente paso debe ser auth por comercio.
alter table public.productos disable row level security;
