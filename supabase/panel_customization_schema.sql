-- ============================================================
-- Personalización del panel de cada creadora (foto, bio, orden
-- de productos, bloques libres de imagen/video).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Foto de perfil + tamaño/posición del avatar y la bio dentro del panel.
--    x/y son porcentajes (0-100) sobre el lienzo del panel; avatar_size en px.
alter table creators add column if not exists avatar_url text;
alter table creators add column if not exists avatar_size integer not null default 128;
alter table creators add column if not exists avatar_position jsonb not null default '{"x":50,"y":8}'::jsonb;
alter table creators add column if not exists bio_position jsonb not null default '{"x":50,"y":30}'::jsonb;

-- 2) Qué producto se muestra primero en el banner de cursos.
alter table creators add column if not exists featured_product_id uuid references products (id) on delete set null;

-- 3) Orden manual de productos (antes solo había created_at).
alter table products add column if not exists order_index integer not null default 0;

-- 4) Bloques libres de imagen/video que cada creadora puede agregar y
--    posicionar dentro de su panel (fuera del flujo de productos).
create table if not exists panel_blocks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  block_type text not null check (block_type in ('image', 'video')),
  media_url text not null,
  x numeric not null default 50,
  y numeric not null default 50,
  width numeric not null default 200,
  height numeric not null default 200,
  z_index integer not null default 0,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table panel_blocks enable row level security;

create policy "panel_blocks_select_public" on panel_blocks for select using (true);

create policy "panel_blocks_manage_own" on panel_blocks for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);
