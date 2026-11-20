-- ============================================================
-- Vencimiento de acceso por producto (Metodología PODEROSAS: 6 meses,
-- se renueva volviendo a pagar — Wompi no tiene cobro recurrente) +
-- relanzamiento del producto con su precio y nombre reales.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Cuántos meses dura el acceso de un producto. NULL = para siempre
--    (como hoy, sin tocar nada de los productos existentes).
alter table products add column if not exists access_duration_months integer;

-- 2) Fecha en la que se vence el acceso de ESA compra en particular.
--    Se calcula una sola vez, cuando el pago queda aprobado (no cambia
--    si el producto cambia de duración después).
alter table orders add column if not exists access_expires_at timestamptz;

-- 3) Para no mandar el mismo recordatorio de renovación más de una vez.
alter table orders add column if not exists renewal_reminder_7d_sent_at timestamptz;
alter table orders add column if not exists renewal_reminder_expiry_sent_at timestamptz;

-- 4) has_access_to_product: igual que antes, pero ahora una compra
--    aprobada con fecha de vencimiento ya pasada deja de dar acceso.
create or replace function public.has_access_to_product(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (select access_tier from products where id = p_product_id) = 'public'
    or (
      (select access_tier from products where id = p_product_id) = 'registered'
      and auth.uid() is not null
    )
    or exists (
      select 1
      from orders o
      where o.product_id = p_product_id
        and o.buyer_id = auth.uid()
        and o.status = 'approved'
        and (o.access_expires_at is null or o.access_expires_at > now())
    )
    or (
      (select access_tier from products where id = p_product_id) = 'subscription'
      and exists (
        select 1
        from memberships m
        join products mp on mp.id = m.product_id
        where m.buyer_id = auth.uid()
          and m.status = 'active'
          and m.current_period_end > now()
          and mp.type = 'membership'
      )
    );
$$;

-- 5) Relanzamiento del producto: nombre comercial real, precio regular
--    real ($497.000 — el de $200.000 era de prueba) y 6 meses de acceso
--    por compra. El precio de LANZAMIENTO ($397.000 hasta el sábado
--    21 de nov. 11:59 p.m.) lo calcula el código, no la base de datos —
--    este price_cents es el precio "normal" al que vuelve el domingo.
update products
set
  title = 'Metodología PODEROSAS 2026–2027',
  price_cents = 49700000,
  access_duration_months = 6
where id = '20a9f3e0-78f5-4708-b476-1033510a5649';
