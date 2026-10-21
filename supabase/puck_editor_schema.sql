-- ============================================================
-- Migra el editor de personalización del panel a Puck (editor
-- visual de bloques apilados, responsive automático). Guarda todo
-- el contenido de la página pública de cada creadora en un solo
-- JSON. No se borra la columna "theme" vieja por compatibilidad,
-- pero deja de usarse una vez cada creadora guarde con el editor nuevo.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

alter table creators add column if not exists puck_data jsonb;
