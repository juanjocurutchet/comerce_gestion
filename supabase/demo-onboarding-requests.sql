-- Solicitudes de demo / alta de cliente (público inserta con anon; provisión solo admin licencias vía RPC).
-- Requiere haber ejecutado antes supabase/licencias-license-admin-rls.sql (función license_admin_from_jwt).

create table if not exists public.demo_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  contact_email text not null,
  contact_name text not null,
  business_name text not null default '',
  contact_phone text not null default '',
  notes text,
  temp_password text,
  activation_key text,
  delivery_message text,
  status text not null default 'pending' check (status in ('pending', 'provisioned', 'rejected')),
  commerce_id text references public.commerces(id) on delete set null,
  source text not null default 'pwa',
  created_at timestamptz not null default now(),
  provisioned_at timestamptz
);

alter table public.demo_onboarding_requests add column if not exists temp_password text;
alter table public.demo_onboarding_requests add column if not exists activation_key text;
alter table public.demo_onboarding_requests add column if not exists delivery_message text;

comment on table public.demo_onboarding_requests is 'Leads demo: el cliente envía desde la PWA; el admin de licencias provisiona comercio + user_commerces vía RPC.';

grant insert on public.demo_onboarding_requests to anon, authenticated;
grant select, update, delete on public.demo_onboarding_requests to authenticated;

alter table public.demo_onboarding_requests enable row level security;

drop policy if exists demo_onboarding_insert_public on public.demo_onboarding_requests;
create policy demo_onboarding_insert_public
  on public.demo_onboarding_requests
  for insert
  to anon, authenticated
  with check (
    source = 'pwa'
    and status = 'pending'
    and length(trim(contact_email)) > 0
    and length(trim(contact_name)) > 0
  );

drop policy if exists demo_onboarding_select_license_admin on public.demo_onboarding_requests;
create policy demo_onboarding_select_license_admin
  on public.demo_onboarding_requests
  for select
  to authenticated
  using (public.license_admin_from_jwt());

drop policy if exists demo_onboarding_update_license_admin on public.demo_onboarding_requests;
create policy demo_onboarding_update_license_admin
  on public.demo_onboarding_requests
  for update
  to authenticated
  using (public.license_admin_from_jwt())
  with check (public.license_admin_from_jwt());

drop policy if exists demo_onboarding_delete_license_admin on public.demo_onboarding_requests;
create policy demo_onboarding_delete_license_admin
  on public.demo_onboarding_requests
  for delete
  to authenticated
  using (public.license_admin_from_jwt());

-- Legacy RPC eliminada de este script para evitar fallos en SQL Editor.
-- El alta/provisión actual se resuelve por API (`api/admin-onboarding.js`).
drop function if exists public.license_admin_provision_demo_request(uuid, text);

-- Historial de «Alta manual» desde api/admin-onboarding.js (PostgREST con service_role).
grant insert on public.demo_onboarding_requests to service_role;

comment on column public.demo_onboarding_requests.source is 'pwa: formulario público; manual: alta desde panel sin solicitud previa.';
comment on column public.demo_onboarding_requests.temp_password is 'Contraseña temporal de un solo uso entregada al cliente en el alta.';
comment on column public.demo_onboarding_requests.activation_key is 'Clave GCOM de activación entregada al cliente.';
comment on column public.demo_onboarding_requests.delivery_message is 'Texto listo para reenviar al cliente con usuario + contraseña temporal + clave.';

notify pgrst, 'reload schema';
