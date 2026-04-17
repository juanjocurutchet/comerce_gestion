-- Si activaste RLS en public.licencias sin política, el anon no ve filas y la activación en PWA falla.
-- Ejecutar solo si en Table Editor → licencias → RLS está ON y la PWA no encuentra la clave.

alter table public.licencias enable row level security;

-- Solo rol anon: la activación usa Bearer anon. Los usuarios authenticated
-- no deben tener SELECT global (ver supabase/licencias-license-admin-rls.sql).
drop policy if exists "licencias_select_anon_clave" on public.licencias;
drop policy if exists licencias_select_anon_activation on public.licencias;
create policy licencias_select_anon_activation
  on public.licencias
  for select
  to anon
  using (true);

notify pgrst, 'reload schema';
