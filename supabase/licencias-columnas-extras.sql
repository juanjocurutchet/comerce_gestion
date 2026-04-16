-- Ejecutar en SQL Editor si ya tenés public.licencias y solo faltan columnas nuevas de la app de escritorio.
-- Si PostgREST devuelve: "Could not find the 'commerce_id' column of 'licencias' in the schema cache",
-- pegá esto y Run; luego reintentá Guardar en Licencias (a veces hace falta unos segundos).

alter table public.licencias add column if not exists es_demo boolean not null default false;
alter table public.licencias add column if not exists commerce_id text;

comment on column public.licencias.es_demo is 'true = demo/prueba; uso operativo del panel admin.';
comment on column public.licencias.commerce_id is 'Opcional: id en public.commerces para alinear sync multi-tenant.';

-- Refrescar caché de esquema de PostgREST (Supabase API)
notify pgrst, 'reload schema';
