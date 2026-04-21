-- Contacto del comercio (alta demo y panel Comercios). Ejecutar en Supabase SQL Editor si aún no existen.

alter table public.commerces add column if not exists email text;
alter table public.commerces add column if not exists telefono text;
alter table public.commerces add column if not exists direccion text;

comment on column public.commerces.email is 'Email de contacto / acceso cloud asociado al alta.';
comment on column public.commerces.telefono is 'Teléfono de contacto (opcional).';
comment on column public.commerces.direccion is 'Dirección del local o fiscal (opcional).';

notify pgrst, 'reload schema';
