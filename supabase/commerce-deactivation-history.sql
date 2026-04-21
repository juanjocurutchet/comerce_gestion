-- =============================================================================
-- Cómo ejecutarlo
-- -----------------------------------------------------------------------------
-- 1) Abrí tu proyecto en https://supabase.com/dashboard
-- 2) Menú izquierdo → SQL → New query
-- 3) Pegá todo este archivo y pulsá Run (o Ctrl+Enter)
-- 4) Si ya corrés licencias-license-admin-rls.sql actualizado, esta tabla puede
--    existir: el script es idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Requiere la función public.license_admin_from_jwt() (script licencias-license-admin-rls.sql).
-- =============================================================================

create table if not exists public.commerce_deactivation_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  commerce_id text,
  actor_email text,
  reason text,
  commerce_snapshot jsonb
);

comment on table public.commerce_deactivation_history is 'Auditoría: bajas (licencia eliminada o comercio desactivado). commerce_id puede ser null si la licencia no tenía comercio vinculado.';
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
