-- Si activaste RLS en public.licencias sin política, el anon no ve filas y la activación en PWA falla.
-- Ejecutar solo si en Table Editor → licencias → RLS está ON y la PWA no encuentra la clave.

alter table public.licencias enable row level security;

drop policy if exists "licencias_select_anon_clave" on public.licencias;
create policy "licencias_select_anon_clave"
  on public.licencias
  for select
  to anon, authenticated
  using (true);

notify pgrst, 'reload schema';
