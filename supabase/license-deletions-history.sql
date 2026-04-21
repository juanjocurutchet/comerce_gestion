-- =============================================================================
-- Cómo ejecutarlo (Supabase)
-- -----------------------------------------------------------------------------
-- Dashboard → tu proyecto → SQL → New query → pegar este archivo → Run.
-- =============================================================================
-- Historial de bajas de licencias (auditoría). Usalo si al eliminar licencias ves
-- error de tabla ausente o querés registrar cada baja.
-- También está en supabase/licencias-license-admin-rls.sql.

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

notify pgrst, 'reload schema';
