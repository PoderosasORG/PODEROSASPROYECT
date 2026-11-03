-- ============================================================
-- Preguntas y respuestas por módulo (tipo comentarios), debajo de la
-- descripción. Cualquiera con acceso al módulo puede preguntar; solo
-- la dueña de la categoría puede responder.
-- Pegar completo en Supabase -> SQL Editor -> Run.
-- ============================================================

create table if not exists module_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references category_modules(id) on delete cascade,
  asker_id uuid not null references profiles(id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists module_questions_module_id_idx on module_questions(module_id);

alter table module_questions enable row level security;

-- Leer: quien tenga acceso al módulo (igual regla que el video y el
-- material de apoyo) o la dueña de la categoría, aunque esté sin publicar.
drop policy if exists "module_questions_select_with_access" on module_questions;
create policy "module_questions_select_with_access" on module_questions for select using (
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

-- Preguntar: solo quien compró el curso (acceso real al módulo publicado),
-- y siempre a nombre de quien está logueada (no se puede preguntar por otra).
drop policy if exists "module_questions_insert_own" on module_questions;
create policy "module_questions_insert_own" on module_questions for insert with check (
  asker_id = auth.uid()
  and exists (
    select 1 from category_modules m
    join course_categories c on c.id = m.category_id
    where m.id = module_id
      and m.is_published = true
      and public.has_access_to_product(c.product_id)
  )
);

-- Responder: solo la dueña de la categoría del módulo.
drop policy if exists "module_questions_update_owner" on module_questions;
create policy "module_questions_update_owner" on module_questions for update using (
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
  )
);
