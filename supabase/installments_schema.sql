-- ============================================================
-- Pago en cuotas (Metodología PODEROSAS):
--   Un plan por compradora. Cada cuota es un pedido normal en `orders`
--   (así finanzas, CRM y el webhook siguen funcionando igual) y cada
--   cuota pagada extiende el acceso (access_expires_at del pedido).
--   Si no paga la siguiente, el acceso se vence solo y se pausa.
-- Pega esto completo en Supabase → SQL Editor → Run. No borra nada.
-- ============================================================

create table if not exists installment_plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  buyer_email text not null,
  buyer_name text,
  buyer_id uuid,
  schedule jsonb not null,               -- copia del calendario aceptado
  total_cents bigint not null,
  installments_total integer not null,
  installments_paid integer not null default 0,
  access_start timestamptz,              -- día del primer pago
  next_due_at timestamptz,               -- fecha límite de la siguiente cuota
  status text not null default 'pendiente'
    check (status in ('pendiente', 'al_dia', 'en_mora', 'completado', 'cancelado')),
  pay_token text not null unique,        -- link privado para pagar la siguiente cuota
  reminded_before_n integer,             -- recordatorio 3 días antes (cuota n)
  reminded_due_n integer,                -- aviso el día que vence (cuota n)
  reminded_paused_n integer,             -- aviso de acceso en pausa (cuota n)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists installment_plans_email_idx on installment_plans (buyer_email);
create index if not exists installment_plans_buyer_idx on installment_plans (buyer_id);
alter table installment_plans enable row level security;
drop policy if exists "installment_plans_admin" on installment_plans;
create policy "installment_plans_admin" on installment_plans for select using (public.is_poderosas_admin());

alter table orders add column if not exists installment_plan_id uuid references installment_plans(id);
alter table orders add column if not exists installment_number integer;
alter table orders add column if not exists installment_total integer;
create index if not exists orders_installment_plan_idx on orders (installment_plan_id);

select 'ok' as pago_en_cuotas;
