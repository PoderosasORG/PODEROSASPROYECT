-- ============================================================
-- Inventario v3 (correr DESPUÉS de admin_inventory_v2.sql):
--   1) Unidades utilizadas (las sobrantes = compradas − utilizadas).
--   2) Historial de modificaciones automático (cada cambio y cada
--      eliminación queda guardado con fecha, quién y antes/después).
--   3) Correcciones del 2026-11-20 a 8 compras de la Masterclass
--      2026-2027, primera generación. Solo actualiza, no crea ni borra.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Unidades utilizadas (vacío = por registrar).
alter table admin_inventory_items add column if not exists quantity_used numeric(12, 2)
  check (quantity_used is null or quantity_used >= 0);

-- Quién hizo el último cambio desde la web (lo llena la página; el
-- historial lo usa para saber quién editó o eliminó).
alter table admin_inventory_items add column if not exists updated_by uuid;

-- 2) Historial de modificaciones.
create table if not exists admin_inventory_history (
  id bigint generated always as identity primary key,
  item_id uuid not null,              -- sin FK: el historial sobrevive aunque se elimine la compra
  event_name text,
  item text,
  action text not null check (action in ('editado', 'eliminado')),
  changes jsonb not null,             -- { campo: { antes, despues } } o la fila completa si se eliminó
  changed_by uuid,                    -- vacío = cambio hecho desde el SQL Editor
  changed_at timestamptz not null default now()
);
create index if not exists admin_inventory_history_item_idx on admin_inventory_history (item_id, changed_at desc);

alter table admin_inventory_history enable row level security;
drop policy if exists "admin_inventory_history_read" on admin_inventory_history;
create policy "admin_inventory_history_read" on admin_inventory_history for select
  using (public.is_poderosas_admin());

create or replace function public.log_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb;
begin
  if tg_op = 'DELETE' then
    insert into admin_inventory_history (item_id, event_name, item, action, changes, changed_by)
    values (old.id, old.event_name, old.item, 'eliminado', to_jsonb(old), coalesce(auth.uid(), old.updated_by));
    return old;
  end if;

  select jsonb_object_agg(o.key, jsonb_build_object('antes', o.value, 'despues', n.value))
    into diff
  from jsonb_each(to_jsonb(old)) o
  join jsonb_each(to_jsonb(new)) n using (key)
  where o.value is distinct from n.value
    and o.key <> 'updated_by';

  if diff is not null then
    insert into admin_inventory_history (item_id, event_name, item, action, changes, changed_by)
    values (new.id, new.event_name, new.item, 'editado', diff, coalesce(auth.uid(), new.updated_by));
  end if;
  return new;
end;
$$;

drop trigger if exists admin_inventory_log on admin_inventory_items;
create trigger admin_inventory_log
  after update or delete on admin_inventory_items
  for each row execute function public.log_inventory_change();

-- 3) Correcciones confirmadas por Kat (quedan en el historial).
with ev as (select 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación'::text as name),
fix (item, quantity, unit_cost_cents, total_cents, store, paid, notes) as (
  values
  ('Tarritos pequeños para aceite de coco', 33::numeric, 180000::bigint, 5940000::bigint, 'China',      true, null::text),
  ('Esferos de gel',                        36, 166667, 6000000, 'Dollarcity', true,
     '3 paquetes de 12 a $20.000. Sobraron algunos: registrar cuántos se usaron.'),
  ('Hojas para sobres',                     33, 15152, 500000, 'China',      true, 'Valor confirmado el 20 nov (antes era aproximado)'),
  ('Servilletas rosadas',                   3, 833333, 2500000, 'Dollarcity', true, '3 paquetes'),
  ('Cinta pegante',                         1, 1600000, 1600000, 'China',     true, null),
  ('Hilo caucho para coronitas',            null, null, 500000, 'China',      true, null),
  ('Stickers de letras para espejos',       null, null, 3000000, 'San Cristóbal', true, null),
  ('Stickers generales de PODEROSAS',       null, null, 7000000, 'San Cristóbal', true, null)
)
update admin_inventory_items x
set quantity        = coalesce(f.quantity, x.quantity),
    unit_cost_cents = coalesce(f.unit_cost_cents, x.unit_cost_cents),
    total_cents     = f.total_cents,
    store           = f.store,
    paid            = f.paid,
    is_estimated    = false,
    status          = 'comprado',
    notes           = coalesce(f.notes, x.notes),
    updated_by      = null
from fix f, ev
where x.event_name = ev.name and lower(x.item) = lower(f.item);

-- 4) Resumen para comprobar.
select
  count(*)                                                 as registros,
  sum(total_cents) filter (where not is_estimated) / 100   as confirmado_cop,
  sum(total_cents) filter (where is_estimated) / 100       as estimado_cop,
  sum(total_cents) / 100                                   as total_cop,
  count(*) filter (where quantity is null)                 as sin_cantidad,
  count(*) filter (where store is null)                    as sin_tienda,
  (select count(*) from admin_inventory_history)           as cambios_en_historial
from admin_inventory_items
where event_name = 'Evento Presencial Masterclass Poderosas 2026-2027, primera generación';
