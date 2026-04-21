-- =============================================================================
-- Panel de licencias PWA sin service role: RLS + JWT (email en auth.jwt()).
-- =============================================================================
-- 1) Ejecutá este script en Supabase → SQL Editor (una vez o al actualizar).
-- 2) Insertá admins:  insert into public.license_admin_allowlist (email) values ('tu@correo.com');
-- 3) En la PWA: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, sesión Supabase Auth
--    del admin, y cabeceras PostgREST estándar (apikey=anon, Authorization=user JWT).
--
-- La activación por clave sigue con rol anon (Bearer anon); el SELECT amplio
-- queda solo para anon, no para authenticated (así un usuario logueado no lee
-- todas las licencias salvo que esté en la allowlist).
-- =============================================================================

create table if not exists public.license_admin_allowlist (
  email text primary key
);

alter table public.licencias add column if not exists demo_contact_email text;
alter table public.licencias add column if not exists temp_password text;
alter table public.licencias add column if not exists delivery_message text;

comment on column public.licencias.demo_contact_email is 'Email de acceso cloud entregado al cliente en altas demo.';
comment on column public.licencias.temp_password is 'Contraseña temporal de un solo uso entregada al cliente en altas demo.';
comment on column public.licencias.delivery_message is 'Mensaje editable para copiar/reenviar credenciales al cliente.';

comment on table public.license_admin_allowlist is 'Emails (Supabase Auth) con permiso de CRUD/listado en licencias, upgrade_requests y listado de commerces vía RLS.';

-- Nadie lee la tabla por API; solo la función security definer.
revoke all on public.license_admin_allowlist from public;
revoke all on public.license_admin_allowlist from anon, authenticated;
grant select, insert, update, delete on public.license_admin_allowlist to service_role;

alter table public.license_admin_allowlist enable row level security;

create or replace function public.license_admin_from_jwt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.license_admin_allowlist a
    where lower(trim(a.email)) = lower(trim(coalesce(nullif(trim(auth.jwt() ->> 'email'), ''), '')))
  );
$$;

comment on function public.license_admin_from_jwt() is 'true si el email del JWT está en license_admin_allowlist; no expone la lista completa vía SELECT.';

revoke all on function public.license_admin_from_jwt() from public;
grant execute on function public.license_admin_from_jwt() to authenticated;

-- Permisos DML para el panel (PostgREST como usuario autenticado).
grant insert, update, delete on public.licencias to authenticated;
grant select on public.upgrade_requests to authenticated;

alter table public.licencias enable row level security;

-- Sustituye la política “anon + authenticated” si existía (authenticated ya no lee todo).
drop policy if exists "licencias_select_anon_clave" on public.licencias;
drop policy if exists licencias_select_anon_activation on public.licencias;
create policy licencias_select_anon_activation
  on public.licencias
  for select
  to anon
  using (true);

drop policy if exists licencias_select_license_admin on public.licencias;
create policy licencias_select_license_admin
  on public.licencias
  for select
  to authenticated
  using (public.license_admin_from_jwt());

drop policy if exists licencias_insert_license_admin on public.licencias;
create policy licencias_insert_license_admin
  on public.licencias
  for insert
  to authenticated
  with check (public.license_admin_from_jwt());

drop policy if exists licencias_update_license_admin on public.licencias;
create policy licencias_update_license_admin
  on public.licencias
  for update
  to authenticated
  using (public.license_admin_from_jwt())
  with check (public.license_admin_from_jwt());

drop policy if exists licencias_delete_license_admin on public.licencias;
create policy licencias_delete_license_admin
  on public.licencias
  for delete
  to authenticated
  using (public.license_admin_from_jwt());

-- Solicitudes de upgrade: solo admins listan.
drop policy if exists upgrade_requests_select_license_admin on public.upgrade_requests;
create policy upgrade_requests_select_license_admin
  on public.upgrade_requests
  for select
  to authenticated
  using (public.license_admin_from_jwt());

-- Comercios: además de “los míos”, admins ven el listado completo para el combo del panel.
drop policy if exists commerces_select_license_admin on public.commerces;
create policy commerces_select_license_admin
  on public.commerces
  for select
  to authenticated
  using (public.license_admin_from_jwt());

create table if not exists public.license_deletions_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_email text,
  source text not null default 'unknown',
  reason text,
  commerce_id text,
  license_key text,
  license_snapshot jsonb,
  onboarding_snapshot jsonb
);

comment on table public.license_deletions_history is 'Historial de bajas de licencias y su onboarding relacionado para auditoria/estadistica.';
comment on column public.license_deletions_history.source is 'Origen de la accion de baja (licencias o altas).';

grant insert, select on public.license_deletions_history to authenticated;
grant insert, select, update, delete on public.license_deletions_history to service_role;

alter table public.license_deletions_history enable row level security;

drop policy if exists license_deletions_history_insert_license_admin on public.license_deletions_history;
create policy license_deletions_history_insert_license_admin
  on public.license_deletions_history
  for insert
  to authenticated
  with check (public.license_admin_from_jwt());

drop policy if exists license_deletions_history_select_license_admin on public.license_deletions_history;
create policy license_deletions_history_select_license_admin
  on public.license_deletions_history
  for select
  to authenticated
  using (public.license_admin_from_jwt());

create table if not exists public.commerce_deactivation_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  commerce_id text,
  actor_email text,
  reason text,
  commerce_snapshot jsonb
);

comment on table public.commerce_deactivation_history is 'Auditoría: bajas (licencia eliminada o comercio desactivado desde panel admin). commerce_id puede ser null si la licencia no tenía comercio vinculado.';
comment on column public.commerce_deactivation_history.reason is 'delete_onboarding_full | delete_license_full | …';

alter table public.commerce_deactivation_history alter column commerce_id drop not null;

grant select, insert on public.commerce_deactivation_history to authenticated;
grant select, insert, update, delete on public.commerce_deactivation_history to service_role;

alter table public.commerce_deactivation_history enable row level security;

drop policy if exists commerce_deactivation_history_insert_license_admin on public.commerce_deactivation_history;
create policy commerce_deactivation_history_insert_license_admin
  on public.commerce_deactivation_history
  for insert
  to authenticated
  with check (public.license_admin_from_jwt());

drop policy if exists commerce_deactivation_history_select_license_admin on public.commerce_deactivation_history;
create policy commerce_deactivation_history_select_license_admin
  on public.commerce_deactivation_history
  for select
  to authenticated
  using (public.license_admin_from_jwt());

notify pgrst, 'reload schema';
