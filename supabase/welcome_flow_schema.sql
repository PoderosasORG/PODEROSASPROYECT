-- ============================================================
-- Flujo de bienvenida de alumnas (Metodología PODEROSAS):
--   1) Estados de cada alumna (compra confirmada → participación).
--   2) Encuentros grupales y asistencia.
--   3) Fecha planeada de publicación de cada módulo.
--   4) Registro de correos enviados (evita duplicados si Wompi
--      repite el aviso de pago).
--   5) Preferencias de comunicación (operativo vs. marketing).
-- Pega esto completo en Supabase → SQL Editor → Run. No borra nada.
-- ============================================================

-- 1) Estados de la alumna, uno por producto y correo.
create table if not exists student_journey (
  product_id uuid not null references products (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  full_name text,
  order_id uuid references orders (id) on delete set null,
  purchase_confirmed_at timestamptz,
  account_activated_at timestamptz,
  first_login_at timestamptz,
  first_module_started_at timestamptz,
  first_activity_completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (product_id, email)
);
create index if not exists student_journey_user_idx on student_journey (user_id);
alter table student_journey enable row level security;
drop policy if exists "student_journey_admin" on student_journey;
create policy "student_journey_admin" on student_journey for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- 2) Encuentros grupales (clases en vivo) y asistencia.
create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table live_sessions enable row level security;
drop policy if exists "live_sessions_admin" on live_sessions;
create policy "live_sessions_admin" on live_sessions for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());
-- Las alumnas con acceso pueden ver el calendario.
drop policy if exists "live_sessions_students_read" on live_sessions;
create policy "live_sessions_students_read" on live_sessions for select
  using (public.has_access_to_product(product_id));

create table if not exists live_session_attendance (
  session_id uuid not null references live_sessions (id) on delete cascade,
  email text not null,
  marked_at timestamptz not null default now(),
  primary key (session_id, email)
);
alter table live_session_attendance enable row level security;
drop policy if exists "live_attendance_admin" on live_session_attendance;
create policy "live_attendance_admin" on live_session_attendance for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- 3) Fecha planeada de publicación de cada módulo (para el calendario).
alter table category_modules add column if not exists planned_publish_date date;

-- 4) Correos enviados. dedupe_key único = nunca el mismo correo dos veces.
create table if not exists email_log (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  email text not null,
  kind text not null,
  category text not null check (category in ('operativo', 'marketing')),
  status text not null default 'enviando' check (status in ('enviando', 'enviado', 'fallido')),
  created_at timestamptz not null default now()
);
alter table email_log enable row level security;
drop policy if exists "email_log_admin" on email_log;
create policy "email_log_admin" on email_log for select using (public.is_poderosas_admin());

-- 5) Preferencias de comunicación. Por defecto NO se envía marketing.
create table if not exists communication_preferences (
  email text primary key,
  marketing_opt_in boolean not null default false,
  consent_source text,
  manage_token uuid not null unique default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table communication_preferences enable row level security;
drop policy if exists "comm_prefs_admin" on communication_preferences;
create policy "comm_prefs_admin" on communication_preferences for select using (public.is_poderosas_admin());

-- Consentimiento de marketing marcado en el checkout (opcional, desmarcado por defecto).
alter table orders add column if not exists marketing_opt_in boolean not null default false;

-- Alumnas que ya compraron: se registran como "compra confirmada"
-- (sin enviarles correo de nuevo).
insert into student_journey (product_id, email, user_id, full_name, order_id, purchase_confirmed_at)
select distinct on (o.product_id, lower(o.buyer_email))
  o.product_id, lower(o.buyer_email), o.buyer_id, o.buyer_name, o.id, o.created_at
from orders o
where o.product_id = '20a9f3e0-78f5-4708-b476-1033510a5649'
  and o.status = 'approved'
  and o.buyer_email is not null
order by o.product_id, lower(o.buyer_email), o.created_at
on conflict do nothing;

select count(*) as alumnas_registradas from student_journey;
