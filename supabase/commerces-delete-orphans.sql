-- =============================================================================
-- Borrar comercios huérfanos en Supabase (sin licencia ni alta demo que los referencien)
-- -----------------------------------------------------------------------------
-- Cómo ejecutarlo: Dashboard → SQL → New query → pegar → Run.
--
-- Coincide con el aviso de la PWA ("sin licencia ni alta demo vinculada").
-- NO borra comercios que tengan filas en public.productos (FK restrict);
--   en ese caso borrá o mové primero los productos de ese tenant.
-- user_commerces se limpia en cascada si tu esquema lo define así.
-- =============================================================================

-- 1) Vista previa (solo lectura): descomentá y ejecutá solo esto primero.
/*
select c.id, c.nombre, c.activo, c.created_at
from public.commerces c
where not exists (
  select 1
  from public.licencias l
  where l.commerce_id is not null
    and trim(l.commerce_id) = trim(c.id)
)
and not exists (
  select 1
  from public.demo_onboarding_requests r
  where r.commerce_id is not null
    and trim(r.commerce_id) = trim(c.id)
)
and not exists (
  select 1
  from public.productos p
  where trim(p.commerce_id) = trim(c.id)
)
order by c.created_at desc;
*/

-- 2) Borrado (ejecutá después de revisar la vista previa)

delete from public.commerces c
where not exists (
  select 1
  from public.licencias l
  where l.commerce_id is not null
    and trim(l.commerce_id) = trim(c.id)
)
and not exists (
  select 1
  from public.demo_onboarding_requests r
  where r.commerce_id is not null
    and trim(r.commerce_id) = trim(c.id)
)
and not exists (
  select 1
  from public.productos p
  where trim(p.commerce_id) = trim(c.id)
);

notify pgrst, 'reload schema';
