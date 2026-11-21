-- ============================================================
-- Medición del embudo (Metodología PODEROSAS):
--   1) Eventos propios del embudo (clics en comprar), anónimos.
--   2) Identificadores anónimos de GA4 / Meta en el pedido, para
--      enviar la compra desde el servidor SIN datos personales.
--   3) Registro de eventos ya enviados (evita duplicar compras).
-- Pega esto completo en Supabase → SQL Editor → Run. No borra nada.
-- ============================================================

create table if not exists funnel_events (
  id bigint generated always as identity primary key,
  event text not null,                 -- cta_comprar, cta_ir_a_metodologia…
  location text,                       -- en qué botón/página
  visitor_id text,                     -- cookie anónima pod_vid
  origin text,                         -- fuente de tráfico (utm)
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_event_idx on funnel_events (event, created_at);
alter table funnel_events enable row level security;
drop policy if exists "funnel_events_admin" on funnel_events;
create policy "funnel_events_admin" on funnel_events for select using (public.is_poderosas_admin());

-- Identificadores anónimos (no son nombre, correo ni teléfono).
alter table orders add column if not exists ga_client_id text;  -- cookie _ga
alter table orders add column if not exists meta_fbp text;      -- cookie _fbp
alter table orders add column if not exists meta_fbc text;      -- cookie _fbc

-- Un evento por pedido y plataforma: nunca dos "purchase" del mismo pago.
create table if not exists analytics_sent (
  dedupe_key text primary key,          -- ej. ga4:purchase:<order_id>
  created_at timestamptz not null default now()
);
alter table analytics_sent enable row level security;

select 'ok' as medicion_embudo;
