-- =============================================================================
-- Cómo ejecutarlo (Supabase)
-- -----------------------------------------------------------------------------
-- Dashboard → tu proyecto → SQL → New query → pegar este archivo → Run.
-- =============================================================================
-- Limpieza opcional: marcar como inactivos comercios que ya no tienen licencia vinculada
-- ni solicitud demo pendiente (p. ej. se borró la licencia antes de que existiera este ajuste en la API).
-- Revisá el resultado con un SELECT antes de ejecutar el UPDATE.

-- Vista previa (solo lectura):
-- select c.id, c.nombre, c.activo
-- from public.commerces c
-- where coalesce(c.activo, true) = true
--   and not exists (
--     select 1 from public.licencias l
--     where l.commerce_id is not null and trim(l.commerce_id) = trim(c.id)
--   )
--   and not exists (
--     select 1 from public.demo_onboarding_requests r
--     where r.commerce_id is not null and trim(r.commerce_id) = trim(c.id) and r.status = 'pending'
--   );

update public.commerces c
set activo = false
where coalesce(c.activo, true) = true
  and not exists (
    select 1 from public.licencias l
    where l.commerce_id is not null and trim(l.commerce_id) = trim(c.id)
  )
  and not exists (
    select 1 from public.demo_onboarding_requests r
    where r.commerce_id is not null and trim(r.commerce_id) = trim(c.id) and r.status = 'pending'
  );

notify pgrst, 'reload schema';
