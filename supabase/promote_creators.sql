-- ============================================================
-- Convierte a Kat, Shei y Luz en creadoras.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Marca cada perfil como "creator"
update profiles
set role = 'creator'
where id in (
  select id from auth.users where email = 'planesks@gmail.com'      -- Kat
  union
  select id from auth.users where email = 'sheirivera@outlook.com'  -- Shei
  union
  select id from auth.users where email = 'luzart05@hotmail.com'    -- Luz
);

-- 2) Crea su fila en "creators" con su slug público
insert into creators (id, slug, display_name, bio)
select id, 'kat', 'Kat', 'Fundadora de Poderosas. Metodología, claridad y acción.'
from auth.users where email = 'planesks@gmail.com'
on conflict (id) do update set slug = excluded.slug, display_name = excluded.display_name;

insert into creators (id, slug, display_name, bio)
select id, 'shei', 'Shei', 'Contenido y productos digitales de crecimiento personal.'
from auth.users where email = 'sheirivera@outlook.com'
on conflict (id) do update set slug = excluded.slug, display_name = excluded.display_name;

insert into creators (id, slug, display_name, bio)
select id, 'luz', 'Luz', 'Acompañamiento con experiencia y sabiduría.'
from auth.users where email = 'luzart05@hotmail.com'
on conflict (id) do update set slug = excluded.slug, display_name = excluded.display_name;

-- 3) Verifica el resultado
select p.full_name, p.role, c.slug, c.display_name
from profiles p
join creators c on c.id = p.id;
