-- ============================================================
-- Integración de pagos con Wompi.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- La llave PÚBLICA de Wompi de cada creadora ya existe en
-- creators.wompi_public_key (definida desde el esquema inicial).
-- Aquí guardamos sus llaves SECRETAS aparte, en una tabla sin
-- ninguna política de RLS para anon/authenticated: solo el backend
-- (con la Service Role Key) puede leerlas. El navegador jamás
-- tiene acceso a esta tabla.
create table if not exists creator_payment_secrets (
  creator_id uuid primary key references creators (id) on delete cascade,
  wompi_integrity_secret text not null,
  wompi_events_secret text,
  created_at timestamptz not null default now()
);

-- Wompi también puede devolver "VOIDED" (transacción anulada),
-- que el esquema original no contemplaba.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'approved', 'declined', 'error', 'voided'));

alter table creator_payment_secrets enable row level security;
-- A propósito: no se crea ninguna policy de select/insert/update.
-- Sin policies, RLS deniega todo a anon/authenticated; solo la
-- Service Role (que ignora RLS por completo) puede leer o escribir
-- aquí, y es también la que usamos para actualizar el estado de
-- una orden ("orders") cuando Wompi confirma un pago.
