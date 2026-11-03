-- ============================================================
-- Metodología Poderosa: curso compartido entre 3 administradoras,
-- cada una dueña de su propia categoría.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists course_categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  owner_id uuid not null references creators (id) on delete restrict,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists category_modules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references course_categories (id) on delete cascade,
  title text not null,
  description text,
  bunny_video_id text,
  custom_thumbnail_url text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists category_module_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references category_modules (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table course_categories enable row level security;
alter table category_modules enable row level security;
alter table category_module_files enable row level security;

-- COURSE_CATEGORIES
drop policy if exists "categories_select_published_product" on course_categories;
create policy "categories_select_published_product" on course_categories for select using (
  exists (select 1 from products p where p.id = product_id and p.is_published = true)
  or owner_id = auth.uid()
);
drop policy if exists "categories_update_own" on course_categories;
create policy "categories_update_own" on course_categories for update using (owner_id = auth.uid());

-- Restricción a nivel de columna: aunque la política RLS pase, Postgres
-- solo deja a las creadoras (rol authenticated) cambiar el título. Sin esto,
-- cualquiera de las 3 admins podría hacer `update course_categories set
-- product_id = '<su propio producto>'` y desviar el pago del BuyButton hacia
-- ella — justo lo que el anclaje por course_categories busca evitar.
revoke update on course_categories from authenticated;
grant update (title) on course_categories to authenticated;

-- CATEGORY_MODULES: público si publicado y hay acceso al producto; la dueña ve/edita los suyos siempre.
drop policy if exists "modules_select_with_access" on category_modules;
create policy "modules_select_with_access" on category_modules for select using (
  (
    is_published = true
    and exists (
      select 1 from course_categories c
      where c.id = category_id and public.has_access_to_product(c.product_id)
    )
  )
  or exists (
    select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid()
  )
);
drop policy if exists "modules_manage_own_category" on category_modules;
create policy "modules_manage_own_category" on category_modules for all using (
  exists (select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid())
);

-- CATEGORY_MODULE_FILES: mismas reglas, a través del módulo.
drop policy if exists "module_files_select_with_access" on category_module_files;
create policy "module_files_select_with_access" on category_module_files for select using (
  exists (
    select 1 from category_modules m
    join course_categories c on c.id = m.category_id
    where m.id = module_id
      and (
        (m.is_published = true and public.has_access_to_product(c.product_id))
        or c.owner_id = auth.uid()
      )
  )
);
drop policy if exists "module_files_manage_own_category" on category_module_files;
create policy "module_files_manage_own_category" on category_module_files for all using (
  exists (
    select 1 from category_modules m
    join course_categories c on c.id = m.category_id
    where m.id = module_id and c.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from category_modules m
    join course_categories c on c.id = m.category_id
    where m.id = module_id and c.owner_id = auth.uid()
      and (storage.foldername(file_path))[1] = c.owner_id::text
  )
);

-- ============================================================
-- SEMILLA: crea el producto "Metodología Poderosa" (dueño = tu
-- cuenta, Oscar) y las 3 categorías. Ajusta el precio si quieres
-- otro antes de pegarlo. Si tu cuenta de Oscar todavía no tiene
-- fila en "creators", esto falla — avísame y la creamos primero.
-- ============================================================
insert into products (creator_id, type, title, description, price_cents, is_published)
select id, 'course', 'Metodología Poderosa',
  'Un curso construido entre las 3: quién soy, qué quiero y cómo lo logro.',
  0, false
from creators where id = auth.uid()
on conflict do nothing
returning id;

-- Nota: correr el INSERT de arriba desde el SQL Editor usa el rol
-- "postgres" (no tu sesión), así que auth.uid() da null ahí. En vez
-- de ese bloque, usa este con el UUID real de Oscar como creador y
-- los UUID reales de Luz/Shei/Kat como dueñas de categoría (los
-- mismos "UID" que se ven en Authentication → Users):

-- insert into products (creator_id, type, title, description, price_cents, is_published)
-- values ('<uuid-de-oscar>', 'course', 'Metodología Poderosa',
--   'Un curso construido entre las 3: quién soy, qué quiero y cómo lo logro.',
--   0, false)
-- returning id;
--
-- insert into course_categories (product_id, owner_id, title, order_index) values
--   ('<id-del-producto-de-arriba>', '<uuid-de-luz>', '¿Quién soy?', 0),
--   ('<id-del-producto-de-arriba>', '<uuid-de-shei>', '¿Qué quiero?', 1),
--   ('<id-del-producto-de-arriba>', '<uuid-de-kat>', '¿Cómo lo logro?', 2);

-- ============================================================
-- Permite que quien compró el curso (o la dueña de la categoría) lea el
-- material de apoyo de un módulo, sin importar quién lo subió. La política
-- "product_files_owner_read" de content_upload_schema.sql solo deja leer a
-- quien subió el archivo, lo cual no sirve para que un comprador descargue
-- el material de apoyo de Metodología Poderosa.
-- ============================================================
drop policy if exists "product_files_buyer_read_module_material" on storage.objects;
create policy "product_files_buyer_read_module_material" on storage.objects for select
  using (
    bucket_id = 'product-files'
    and exists (
      select 1 from category_module_files f
      join category_modules m on m.id = f.module_id
      join course_categories c on c.id = m.category_id
      where f.file_path = storage.objects.name
        and (storage.foldername(f.file_path))[1] = c.owner_id::text
        and (
          (m.is_published = true and public.has_access_to_product(c.product_id))
          or c.owner_id = auth.uid()
        )
    )
  );
