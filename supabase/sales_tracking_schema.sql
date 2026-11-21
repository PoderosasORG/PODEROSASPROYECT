-- ============================================================
-- Seguimiento comercial del lanzamiento (Metodología PODEROSAS):
--   1) Visitas anónimas a la landing (sin datos personales).
--   2) Contactos comerciales con estado y autorización de WhatsApp.
--   3) Historial de contactos (quién escribió, qué plantilla, cuándo).
-- Pega esto completo en Supabase → SQL Editor → Run. No borra nada.
-- ============================================================

-- 1) Visitas a la landing: un registro por navegador (cookie anónima).
create table if not exists landing_visits (
  visitor_id text primary key,
  page text not null,
  origin text,
  visits integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists landing_visits_last_seen_idx on landing_visits (last_seen);
alter table landing_visits enable row level security;
drop policy if exists "landing_visits_admin" on landing_visits;
create policy "landing_visits_admin" on landing_visits for select using (public.is_poderosas_admin());

-- Suma una visita (atómico, para no perder conteos con visitas simultáneas).
create or replace function public.track_landing_visit(p_visitor text, p_page text, p_origin text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into landing_visits (visitor_id, page, origin)
  values (p_visitor, p_page, p_origin)
  on conflict (visitor_id) do update
    set visits = landing_visits.visits + 1, last_seen = now();
$$;
revoke all on function public.track_landing_visit(text, text, text) from public, anon, authenticated;

-- 2) Contactos comerciales.
create table if not exists sales_leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  full_name text,
  source text,                         -- orientacion_web, checkout, masterclass, manual…
  status text not null default 'nuevo'
    check (status in ('nuevo', 'interesada', 'solicito_info', 'checkout', 'pago_pendiente', 'compra', 'no_interesada')),
  whatsapp_consent boolean not null default false,
  consent_at timestamptz,
  consent_source text,
  question text,                       -- duda que dejó en el formulario
  notes text,
  assigned_to text,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- El correo se guarda siempre en minúsculas.
create unique index if not exists sales_leads_email_uq on sales_leads (email) where email is not null;
create unique index if not exists sales_leads_phone_uq on sales_leads (phone) where phone is not null and email is null;
alter table sales_leads enable row level security;
drop policy if exists "sales_leads_admin" on sales_leads;
create policy "sales_leads_admin" on sales_leads for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- 3) Historial de contactos.
create table if not exists sales_contact_log (
  id bigint generated always as identity primary key,
  lead_key text not null,              -- correo o teléfono del contacto
  template text,
  channel text not null default 'whatsapp',
  contacted_by text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists sales_contact_log_key_idx on sales_contact_log (lead_key, created_at desc);
alter table sales_contact_log enable row level security;
drop policy if exists "sales_contact_log_admin" on sales_contact_log;
create policy "sales_contact_log_admin" on sales_contact_log for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

select 'ok' as seguimiento_comercial;
