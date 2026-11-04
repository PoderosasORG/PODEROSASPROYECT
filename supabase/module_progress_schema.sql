-- ============================================================
-- Progreso por usuaria en los módulos del curso: guarda qué
-- clases ya vio cada compradora, para mostrar el check ✓ y el
-- "Continuar con el siguiente" en el visor del curso.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references category_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, module_id)
);

alter table public.module_progress enable row level security;

create policy "module_progress_select_own" on public.module_progress
  for select using (user_id = auth.uid());

-- Solo se puede marcar como visto un módulo al que ya se tiene acceso
-- (comprado, o membresía que lo cubre) — reutiliza has_access_to_product,
-- ya creada en content_delivery_schema.sql.
create policy "module_progress_insert_own" on public.module_progress
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from category_modules m
      join course_categories c on c.id = m.category_id
      where m.id = module_id
        and public.has_access_to_product(c.product_id)
    )
  );

create policy "module_progress_delete_own" on public.module_progress
  for delete using (user_id = auth.uid());
