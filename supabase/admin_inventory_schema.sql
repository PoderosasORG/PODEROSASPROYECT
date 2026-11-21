-- ============================================================
-- Inventario por evento, tipo checklist (/admin/inventario).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- (Necesita que ya exista public.is_poderosas_admin(), que se creó con
-- admin_panel_schema.sql.)
-- ============================================================

create table if not exists admin_inventory_items (
  id uuid primary key default gen_random_uuid(),
  -- Tipo de evento (para agrupar): masterclass presencial, virtual...
  category text not null default 'evento_presencial_masterclass'
    check (category in ('evento_presencial_masterclass', 'evento_virtual', 'otro')),
  -- Nombre del evento al que pertenece la lista. Si el evento existe
  -- como producto en la web, también se guarda su id.
  event_name text not null,
  event_product_id uuid references products (id) on delete set null,
  item text not null,                                    -- qué se compró / qué hace falta
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_cost_cents bigint not null default 0 check (unit_cost_cents >= 0),
  total_cents bigint generated always as (round(quantity * unit_cost_cents)::bigint) stored,
  status text not null default 'pendiente' check (status in ('pendiente', 'comprado')),
  purchase_date date,
  bought_by text,                                        -- quién lo compró
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists admin_inventory_items_event_idx on admin_inventory_items (event_name);

alter table admin_inventory_items enable row level security;
drop policy if exists "admin_inventory_all" on admin_inventory_items;
create policy "admin_inventory_all" on admin_inventory_items for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- Debe devolver 0 (la tabla existe y está vacía).
select count(*) as items_en_inventario from admin_inventory_items;
