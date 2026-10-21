-- ============================================================
-- Entrega de contenido: deja que quien COMPRÓ un producto (o
-- tiene membresía activa que lo cubre) pueda leer sus capítulos
-- y archivos. Antes de esto, solo la creadora dueña podía verlos.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- Función reutilizable: ¿este usuario tiene acceso a este producto?
-- Acceso = compró el producto (orden approved) O tiene membresía
-- activa con la creadora dueña y el producto es "gratis para miembros".
create or replace function public.has_access_to_product(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from orders o
    where o.product_id = p_product_id
      and o.buyer_id = auth.uid()
      and o.status = 'approved'
  )
  or exists (
    select 1
    from products p
    join memberships m on m.creator_id = p.creator_id
    where p.id = p_product_id
      and p.is_free_for_members = true
      and m.buyer_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- COURSE_LESSONS: además de la creadora dueña, puede leer quien tenga
-- acceso al producto, y cualquiera puede leer los capítulos marcados
-- como vista previa gratis.
create policy "lessons_select_with_access" on course_lessons for select using (
  is_free_preview = true or public.has_access_to_product(product_id)
);

-- PRODUCT_FILES: igual que arriba (sin vista previa gratis para archivos).
create policy "product_files_select_with_access" on product_files for select using (
  public.has_access_to_product(product_id)
);
