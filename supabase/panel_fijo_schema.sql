-- ============================================================
-- Reemplaza el lienzo libre (Puck, arrastrar-y-soltar) por un panel
-- de formulario fijo: avatar/portada con punto focal, bio con estilo
-- simple (negrita/cursiva/tamaño), y una lista ordenada de bloques
-- opcionales (texto/imagen/video) que se reordenan con botones, no
-- arrastrando. Los cursos se muestran en una sección fija y automática
-- (no se edita aquí, se arma sola desde los productos publicados).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

alter table creators add column if not exists avatar_focus_x numeric not null default 50;
alter table creators add column if not exists avatar_focus_y numeric not null default 50;
alter table creators add column if not exists cover_focus_x numeric not null default 50;
alter table creators add column if not exists cover_focus_y numeric not null default 50;
alter table creators add column if not exists content_blocks jsonb not null default '[]';
