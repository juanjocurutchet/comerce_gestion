-- Solicitudes de upgrade a plan pago (modal demo / formulario).
-- El cliente (PWA o escritorio) inserta con la clave anónima; RLS permite solo INSERT.
-- Consultá los registros en el panel de Supabase (rol service) o añadí políticas SELECT para staff.

create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  commerce_size text not null default '',
  current_days_left integer,
  source text not null default 'unknown',
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.upgrade_requests is 'Leads / solicitudes de paso a plan pago desde la app.';

alter table public.upgrade_requests enable row level security;

drop policy if exists upgrade_requests_insert_public on public.upgrade_requests;
create policy upgrade_requests_insert_public
  on public.upgrade_requests
  for insert
  to anon, authenticated
  with check (
    length(trim(client_name)) > 0
    and length(trim(contact_name)) > 0
    and length(trim(contact_email)) > 0
    and source in ('pwa', 'desktop')
  );

-- Sin política SELECT para anon/authenticated: no listado desde la app con clave pública.
-- service_role ignora RLS y puede leer en Table Editor o scripts admin.
