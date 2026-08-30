-- ============================================================
-- Amplía "products" para el wizard de subida de contenido,
-- crea la tabla de archivos por producto, y prepara el
-- almacenamiento (Storage) para portadas y archivos.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Permite el tipo "physical" además de los que ya existían
alter table products drop constraint if exists products_type_check;
alter table products add constraint products_type_check
  check (type in ('digital', 'course', 'event', 'membership', 'physical'));

-- 2) Campos nuevos para el wizard
alter table products add column if not exists content_type text
  check (content_type in ('ebook', 'plantilla', 'fisico', 'curso', 'otro'));
alter table products add column if not exists content_type_other text;
alter table products add column if not exists is_free_for_members boolean not null default false;
alter table products add column if not exists coupon_code text;

-- 3) Archivos que sube la creadora para un producto (ebook, plantillas, "otro")
create table if not exists product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table product_files enable row level security;

create policy "product_files_manage_own" on product_files for all
  using (exists (select 1 from products p where p.id = product_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.creator_id = auth.uid()));

-- 4) Buckets de almacenamiento: portadas (públicas) y archivos de producto (privados)
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

-- 5) Seguridad de Storage: cada creadora solo puede subir/leer/borrar
-- dentro de su propia carpeta (la carpeta = su user id).
create policy "covers_public_read" on storage.objects for select
  using (bucket_id = 'covers');

create policy "covers_owner_write" on storage.objects for insert
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "covers_owner_delete" on storage.objects for delete
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "product_files_owner_read" on storage.objects for select
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "product_files_owner_write" on storage.objects for insert
  with check (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "product_files_owner_delete" on storage.objects for delete
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
