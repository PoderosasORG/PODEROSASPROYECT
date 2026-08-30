-- ============================================================
-- PODEROSAS.ORG — Esquema inicial de base de datos
-- Pega este archivo completo en Supabase → SQL Editor → Run
-- ============================================================

-- 1. PERFILES
-- Cada usuario que se registra (con Supabase Auth) obtiene una fila aquí.
-- role define si es "customer" (cliente) o "creator" (Kat, Shei, Luz).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'creator', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. CREADORAS
-- Extiende profiles cuando role = 'creator'. slug = kat / shei / luz.
create table if not exists creators (
  id uuid primary key references profiles (id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  bio text,
  cover_image_url text,
  wompi_public_key text,   -- llave pública de Wompi de ESA creadora (para que el cobro vaya a su cuenta)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. PRODUCTOS
-- Cubre: ebook/recurso, curso, masterclass/taller, evento presencial y membresía.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  type text not null check (type in ('digital', 'course', 'event', 'membership')),
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'COP',
  billing_interval text check (billing_interval in ('month', 'year')), -- solo aplica si type = 'membership'
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. CAPÍTULOS DE CURSO (tipo Ucademy)
create table if not exists course_lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  title text not null,
  video_url text,
  order_index integer not null default 0,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. PEDIDOS / COMPRAS
-- Registro de cada intento de pago vía Wompi.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  creator_id uuid not null references creators (id) on delete restrict,
  amount_cents integer not null,
  currency text not null default 'COP',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'error')),
  wompi_transaction_id text,
  created_at timestamptz not null default now()
);

-- 6. MEMBRESÍAS ACTIVAS
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles (id) on delete cascade,
  creator_id uuid not null references creators (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired', 'canceled')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- 7. INSCRIPCIONES A EVENTOS
create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEGURIDAD (Row Level Security) — el "blindaje"
-- Sin esto, cualquiera con la llave pública podría leer/editar
-- todo. Con esto, cada quien solo ve y toca lo que le corresponde.
-- ============================================================

alter table profiles enable row level security;
alter table creators enable row level security;
alter table products enable row level security;
alter table course_lessons enable row level security;
alter table orders enable row level security;
alter table memberships enable row level security;
alter table event_registrations enable row level security;

-- PROFILES: cada quien ve y edita solo su propio perfil.
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- CREATORS: el perfil público de cada creadora es visible para todos (para el home y /kat, /shei, /luz).
-- Pero solo la propia creadora puede editar su fila.
create policy "creators_select_public" on creators for select using (true);
create policy "creators_update_own" on creators for update using (auth.uid() = id);

-- PRODUCTS: los productos publicados son visibles para todos.
-- Solo la creadora dueña puede crear/editar/borrar los suyos.
create policy "products_select_published" on products for select using (is_published = true);
create policy "products_select_own_unpublished" on products for select using (auth.uid() = creator_id);
create policy "products_insert_own" on products for insert with check (auth.uid() = creator_id);
create policy "products_update_own" on products for update using (auth.uid() = creator_id);
create policy "products_delete_own" on products for delete using (auth.uid() = creator_id);

-- COURSE_LESSONS: visibles solo si el producto es de esa creadora, o si el usuario ya compró/tiene membresía activa (lo afinamos cuando integremos compras).
create policy "lessons_select_own_creator" on course_lessons for select using (
  exists (select 1 from products p where p.id = product_id and p.creator_id = auth.uid())
);
create policy "lessons_manage_own_creator" on course_lessons for all using (
  exists (select 1 from products p where p.id = product_id and p.creator_id = auth.uid())
);

-- ORDERS: cada cliente ve solo sus propios pedidos; cada creadora ve solo los pedidos de sus productos.
create policy "orders_select_own_buyer" on orders for select using (auth.uid() = buyer_id);
create policy "orders_select_own_creator" on orders for select using (auth.uid() = creator_id);
create policy "orders_insert_own_buyer" on orders for insert with check (auth.uid() = buyer_id);

-- MEMBERSHIPS: igual que orders.
create policy "memberships_select_own_buyer" on memberships for select using (auth.uid() = buyer_id);
create policy "memberships_select_own_creator" on memberships for select using (auth.uid() = creator_id);

-- EVENT_REGISTRATIONS: cada quien ve solo sus inscripciones.
create policy "events_select_own_buyer" on event_registrations for select using (auth.uid() = buyer_id);
create policy "events_insert_own_buyer" on event_registrations for insert with check (auth.uid() = buyer_id);

-- ============================================================
-- Cuando un usuario se registra en Supabase Auth, crea su fila
-- en "profiles" automáticamente.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
