-- ============================================================
-- V3: bloques de texto y de producto (además de imagen/video),
-- para poder posicionar libremente también los productos.
-- Pega esto completo en Supabase → SQL Editor → Run
-- (después de panel_customization_schema.sql y _v2.sql).
-- ============================================================

alter table panel_blocks drop constraint if exists panel_blocks_block_type_check;
alter table panel_blocks add constraint panel_blocks_block_type_check
  check (block_type in ('image', 'video', 'text', 'product'));

-- Los bloques de texto/producto no tienen media_url.
alter table panel_blocks alter column media_url drop not null;

alter table panel_blocks add column if not exists product_id uuid references products (id) on delete cascade;
alter table panel_blocks add column if not exists text_content text;
alter table panel_blocks add column if not exists text_style jsonb not null default
  '{"bold":false,"italic":false,"fontSize":16,"color":"#2A2420"}'::jsonb;
