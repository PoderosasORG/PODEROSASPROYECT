-- ============================================================
-- V2: banner de portada, vistas independientes móvil/escritorio,
-- y personalización de colores/tipografía.
-- Pega esto completo en Supabase → SQL Editor → Run
-- (después de haber corrido panel_customization_schema.sql).
-- ============================================================

-- 1) Portada tipo Facebook: cover_image_url ya existía; agregamos
--    el desplazamiento vertical para "arrastrar y reposicionar".
alter table creators add column if not exists cover_offset_y numeric not null default 50;

-- 2) Tamaño de avatar independiente por vista.
alter table creators rename column avatar_size to avatar_size_mobile;
alter table creators add column if not exists avatar_size_desktop integer not null default 220;

-- 3) Posición del avatar y de la bio, independiente por vista
--    (antes era un solo {x,y} compartido entre teléfono y PC).
update creators set avatar_position = jsonb_build_object('mobile', avatar_position, 'desktop', avatar_position)
  where not (avatar_position ? 'mobile');
update creators set bio_position = jsonb_build_object('mobile', bio_position, 'desktop', bio_position)
  where not (bio_position ? 'mobile');

alter table creators alter column avatar_position
  set default '{"mobile":{"x":50,"y":18},"desktop":{"x":50,"y":50}}'::jsonb;
alter table creators alter column bio_position
  set default '{"mobile":{"x":50,"y":40},"desktop":{"x":75,"y":50}}'::jsonb;

-- 4) Estilo del texto de la bio (negrita, cursiva, tamaño).
alter table creators add column if not exists bio_style jsonb not null default '{"bold":false,"italic":false,"fontSize":14}'::jsonb;

-- 5) Tema visual: colores y tipografía de todo el panel.
alter table creators add column if not exists theme jsonb not null default
  '{"bgColor":"#FDF6EE","textColor":"#2A2420","accentColor":"#C9A24B","fontFamily":"serif"}'::jsonb;

-- 6) Cada bloque libre (imagen/video) pertenece a una vista.
alter table panel_blocks add column if not exists device text not null default 'mobile'
  check (device in ('mobile', 'desktop'));
