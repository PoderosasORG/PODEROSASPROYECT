-- ============================================================
-- Panel interno /admin: finanzas, CRM, suscripciones y gastos.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- (Antes de correrlo, confirma arriba que el proyecto sea PODEROSASORG.)
-- ============================================================

-- 1) Quién puede entrar a /admin. Lista explícita (no "cualquier
--    creadora"), para que agregar una creadora nueva no le dé acceso
--    automático a las finanzas de todas.
create table if not exists admin_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admin_members enable row level security;

drop policy if exists "admin_members_select_own" on admin_members;
create policy "admin_members_select_own" on admin_members for select
  using (user_id = auth.uid());

create or replace function public.is_poderosas_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admin_members where user_id = auth.uid());
$$;

-- Las 3 administradoras (Kat, Shei, Luz): se agregan por su correo de
-- inicio de sesión. Cambia los correos si alguno no coincide.
-- Debe devolver 3 filas; si devuelve menos, ese correo no tiene cuenta.
insert into admin_members (user_id)
select p.id
from profiles p
join creators c on c.id = p.id
where c.slug in ('kat', 'shei', 'luz')
on conflict do nothing
returning user_id;

-- 2) Datos de CRM y finanzas en cada pedido. Se llenan solos desde
--    ahora (checkout + webhook de Wompi); los pedidos viejos quedan
--    vacíos en estas columnas.
alter table orders add column if not exists buyer_phone text;          -- con indicativo, ej. +57 3001234567
alter table orders add column if not exists buyer_address text;
alter table orders add column if not exists buyer_city text;
alter table orders add column if not exists buyer_region text;
alter table orders add column if not exists buyer_country text;
alter table orders add column if not exists origin text;               -- utm_source / ref / sitio de donde llegó
alter table orders add column if not exists wompi_payment_method text; -- CARD, NEQUI, PSE, BANCOLOMBIA_TRANSFER...
alter table orders add column if not exists wompi_fee_cents integer;   -- comisión estimada de Wompi (con IVA)
alter table orders add column if not exists coupon_code text;          -- se usará cuando existan los códigos

-- 3) Suscripciones y servicios que paga Poderosas (Vercel, Bunny,
--    Supabase, dominio, etc.). Solo se guardan los ÚLTIMOS 4 dígitos
--    de la tarjeta — nunca el número completo.
create table if not exists admin_subscriptions (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  provider text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'COP',
  amount_cop_cents bigint check (amount_cop_cents >= 0),  -- lo que cobran en pesos (aprox.)
  billing_period text not null default 'mensual' check (billing_period in ('mensual', 'anual', 'unico')),
  next_renewal date,
  card_label text,                                         -- ej. "Visa Bancolombia"
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  paid_by text,                                            -- quién la paga
  account_holder text,                                     -- a nombre de quién está la cuenta
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table admin_subscriptions enable row level security;
drop policy if exists "admin_subscriptions_all" on admin_subscriptions;
create policy "admin_subscriptions_all" on admin_subscriptions for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- 4) Gastos reales (cada cobro o compra), con su factura.
create table if not exists admin_expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  category text not null default 'otro'
    check (category in ('suscripcion', 'evento', 'publicidad', 'produccion', 'honorarios', 'comisiones', 'otro')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'COP',
  amount_cop_cents bigint not null check (amount_cop_cents >= 0), -- valor en pesos que salió de la cuenta
  expense_date date not null default current_date,
  paid_by text,
  card_label text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  subscription_id uuid references admin_subscriptions (id) on delete set null,
  event_product_id uuid references products (id) on delete set null,
  invoice_path text,
  invoice_name text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table admin_expenses enable row level security;
drop policy if exists "admin_expenses_all" on admin_expenses;
create policy "admin_expenses_all" on admin_expenses for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- 5) Bucket PRIVADO para las facturas (PDF o foto). Solo admins.
insert into storage.buckets (id, name, public)
values ('facturas', 'facturas', false)
on conflict (id) do nothing;

drop policy if exists "facturas_admin_all" on storage.objects;
create policy "facturas_admin_all" on storage.objects for all
  using (bucket_id = 'facturas' and public.is_poderosas_admin())
  with check (bucket_id = 'facturas' and public.is_poderosas_admin());
