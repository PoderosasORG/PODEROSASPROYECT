-- ============================================================
-- Inventario v2: tienda, categoría del artículo, valores estimados,
-- datos pendientes por confirmar y pago. + Carga de las 21 compras
-- del Evento Presencial Masterclass Poderosas 2026-2027, primera
-- generación (lista enviada por Kat el 2026-11-20).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- No borra nada: solo agrega columnas y registros nuevos.
-- ============================================================

-- 1) El total deja de ser "cantidad × unitario" obligatorio: hay
--    compras con total conocido y cantidad por confirmar. La columna
--    calculada se reemplaza por una normal, conservando sus valores.
--    (Se puede correr más de una vez sin problema.)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'admin_inventory_items' and column_name = 'total_cents' and is_generated = 'ALWAYS'
  ) then
    alter table admin_inventory_items add column total_value_cents bigint;
    update admin_inventory_items set total_value_cents = total_cents;
    alter table admin_inventory_items drop column total_cents;
    alter table admin_inventory_items rename column total_value_cents to total_cents;
    alter table admin_inventory_items add constraint admin_inventory_total_nonneg
      check (total_cents is null or total_cents >= 0);
  end if;
end $$;

-- Cantidad y valor unitario ya pueden quedar "pendientes" (vacíos).
alter table admin_inventory_items alter column quantity drop not null;
alter table admin_inventory_items alter column quantity drop default;
alter table admin_inventory_items alter column unit_cost_cents drop not null;
alter table admin_inventory_items alter column unit_cost_cents drop default;

-- 2) Columnas nuevas.
alter table admin_inventory_items add column if not exists item_category text;      -- Papelería, Coffee break…
alter table admin_inventory_items add column if not exists store text;              -- tienda / proveedor
alter table admin_inventory_items add column if not exists is_estimated boolean not null default false; -- valor aproximado
alter table admin_inventory_items add column if not exists paid boolean;            -- true = pagado, null = por confirmar

-- 3) Las 21 compras. Si un artículo con el mismo nombre ya existe en
--    este evento, NO se vuelve a crear (evita duplicados).
with ev as (
  select 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación'::text as name,
         '4501a7b0-1c5f-4ae0-8220-46bead23a717'::uuid as product_id
),
data (item_category, item, quantity, unit_cost_cents, total_cents, store, paid, is_estimated, notes) as (
  values
  -- PAPELERÍA Y MATERIALES PARA LAS ASISTENTES
  ('Papelería y materiales', 'Libretas para asistentes',            33::numeric, 600000::bigint, 19800000::bigint, 'Dollarcity',                true, false, null),
  ('Papelería y materiales', 'Esferos de gel',                      12, null, 2000000, 'Dollarcity',                true, false, null),
  ('Papelería y materiales', 'Marcadores de punta fina de colores', 2, 2800000, 5600000, 'Dollarcity',                true, false, 'Estuches ($28.000 c/u)'),
  ('Papelería y materiales', 'Espejos de bolsillo',                 33, 300000, 9900000, 'China',                     true, false, null),
  ('Papelería y materiales', 'Hojas rosadas',                       33, null, 500000, null,                           true, false, null),
  ('Papelería y materiales', 'Hojas para sobres',                   null, null, 500000, null,                         null, true,  'Valor aproximado'),
  ('Papelería y materiales', 'Hilo caucho para coronitas',          null, null, 500000, null,                         null, false, null),
  ('Papelería y materiales', 'Papel seda',                          24, null, 400000, 'Centro',                       true, false, 'Pliegos'),
  ('Papelería y materiales', 'Bolsas de regalo',                    33, null, 5500000, 'Dollarcity',                  true, false, 'Promoción 3 x $5.000 (11 paquetes)'),
  ('Papelería y materiales', 'Cinta pegante',                       null, null, 1600000, null,                        true, false, null),
  ('Papelería y materiales', 'Legajadora para impresiones',         1, null, 1200000, 'Dollarcity',                   true, false, null),
  ('Papelería y materiales', 'Stickers de letras para espejos',     null, null, 3000000, 'San Cristóbal',             true, false, null),
  ('Papelería y materiales', 'Stickers generales de PODEROSAS',     null, null, 7000000, 'San Cristóbal',             true, false, null),
  -- ELEMENTOS PARA EL COFFEE BREAK Y ACTIVIDADES
  ('Coffee break y actividades', 'Tarritos pequeños para aceite de coco', null, 180000, null, null,                   null, false, 'Total se calcula cuando se confirme la cantidad'),
  ('Coffee break y actividades', 'Aceite de coco',                  1, 2500000, 2500000, null,                        null, true,  'Litro, valor aproximado'),
  ('Coffee break y actividades', 'Vasos desechables para fruta',    100, null, 1480000, null,                         true, false, null),
  ('Coffee break y actividades', 'Vasos de icopor blancos para tinto o aromática', 60, null, 900000, null,            true, false, '3 paquetes de 20 a $3.000'),
  ('Coffee break y actividades', 'Copas para soda italiana',        40, 60000, 2400000, null,                         true, false, '2 paquetes de 20 a $12.000'),
  ('Coffee break y actividades', 'Servilletas rosadas',             null, null, 2500000, null,                        true, false, null),
  -- TELEFONÍA Y EQUIPO DE SOPORTE PODEROSAS
  ('Telefonía y soporte', 'Batería para celular del equipo PODEROSAS SOPORTE', 1, null, 14000000, 'San Andresito de San José', true, false, 'Uso: celular de oficina del equipo de soporte'),
  ('Telefonía y soporte', 'Tarjeta SIM para celular PODEROSAS SOPORTE',        1, null, 4600000,  'Claro',                     true, false, 'Uso: celular de oficina del equipo de soporte')
)
insert into admin_inventory_items
  (category, event_name, event_product_id, item_category, item, quantity, unit_cost_cents, total_cents,
   store, status, paid, is_estimated, purchase_date, bought_by, notes)
select 'evento_presencial_masterclass', ev.name, ev.product_id, d.item_category, d.item, d.quantity,
       -- Precio unitario calculado cuando se conoce el total y la cantidad.
       coalesce(d.unit_cost_cents, case when d.quantity is not null and d.total_cents is not null
                                        then round(d.total_cents / d.quantity)::bigint end),
       d.total_cents, d.store, 'comprado', d.paid, d.is_estimated, date '2026-11-19', 'Kat Rivera', d.notes
from data d cross join ev
where not exists (
  select 1 from admin_inventory_items x
  where x.event_name = ev.name and lower(x.item) = lower(d.item)
);

-- 4) Resumen para comprobar (debe decir 21 registros).
select
  count(*)                                                        as registros,
  sum(total_cents) filter (where not is_estimated) / 100          as confirmado_cop,
  sum(total_cents) filter (where is_estimated) / 100              as estimado_cop,
  count(*) filter (where total_cents is null)                     as sin_total,
  count(*) filter (where quantity is null)                        as sin_cantidad,
  count(*) filter (where store is null)                           as sin_tienda
from admin_inventory_items
where event_name = 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación';
