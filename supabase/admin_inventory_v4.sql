-- ============================================================
-- Inventario v4 (correr DESPUÉS de v2 y v3):
--   1) Tipo de registro: producto físico o servicio contratado.
--   2) Asistentes de referencia por evento (para el costo por asistente).
--   3) Tres registros nuevos del 20-21 nov 2026 (frutas, bolovanes y
--      servicio de coffee break de Brot). No toca los registros anteriores.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

alter table admin_inventory_items add column if not exists kind text not null default 'producto'
  check (kind in ('producto', 'servicio'));

create table if not exists admin_event_settings (
  event_name text primary key,
  attendees integer check (attendees is null or attendees > 0),
  updated_at timestamptz not null default now()
);
alter table admin_event_settings enable row level security;
drop policy if exists "admin_event_settings_all" on admin_event_settings;
create policy "admin_event_settings_all" on admin_event_settings for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

insert into admin_event_settings (event_name, attendees)
values ('Evento Presencial Masterclass Poderosas 2026-2027, primera generación', 33)
on conflict (event_name) do nothing;

with ev as (
  select 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación'::text as name,
         '4501a7b0-1c5f-4ae0-8220-46bead23a717'::uuid as product_id
),
data (kind, item_category, item, quantity, unit_cost_cents, total_cents, store, paid, purchase_date, bought_by, notes) as (
  values
  ('producto', 'Alimentos y bebidas', 'Frutas para el evento (papaya y melón)', null::numeric, null::bigint, 2765000::bigint,
     'Supermercados Fruvar', true, date '2026-11-20', 'Shay', null::text),
  ('producto', 'Alimentos y bebidas', 'Bolovanes (panes para las asistentes)', 40, 150000, 6000000,
     null, true, date '2026-11-20', 'Luz Amparo', 'Panadería: nombre por confirmar'),
  ('servicio', 'Servicios contratados', 'Servicio de coffee break', null, null, 45000000,
     'Brot Cafetería Emprendu', null, date '2026-11-21', null,
     'Servicio de coffee break para la masterclass. Responsable del pago por confirmar.')
)
insert into admin_inventory_items
  (category, event_name, event_product_id, kind, item_category, item, quantity, unit_cost_cents, total_cents,
   store, status, paid, is_estimated, purchase_date, bought_by, notes)
select 'evento_presencial_masterclass', ev.name, ev.product_id, d.kind, d.item_category, d.item, d.quantity,
       d.unit_cost_cents, d.total_cents, d.store, 'comprado', d.paid, false, d.purchase_date, d.bought_by, d.notes
from data d cross join ev
where not exists (
  select 1 from admin_inventory_items x where x.event_name = ev.name and lower(x.item) = lower(d.item)
);

-- Resumen para comprobar (debe decir 24 registros).
select
  count(*)                                                                      as registros,
  sum(total_cents) / 100                                                        as total_cop,
  sum(total_cents) filter (where kind = 'producto') / 100                       as productos_cop,
  sum(total_cents) filter (where kind = 'servicio') / 100                       as servicios_cop,
  sum(total_cents) filter (where is_estimated) / 100                            as estimado_cop,
  round(sum(total_cents) / 100.0 / 33)                                          as costo_por_asistente_cop
from admin_inventory_items
where event_name = 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación';
