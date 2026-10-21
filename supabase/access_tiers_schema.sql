-- ============================================================
-- Niveles de acceso por contenido + suscripción de plataforma
-- (desbloquea TODO el catálogo de las tres, no solo de una).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

-- 0) Una membresía por comprador y producto (para poder renovar con
--    upsert en vez de crear una fila nueva cada vez que paga de nuevo).
alter table memberships drop constraint if exists memberships_buyer_product_unique;
alter table memberships add constraint memberships_buyer_product_unique unique (buyer_id, product_id);

-- 1) Nivel de acceso de cada producto.
--    public      = cualquiera, sin cuenta.
--    registered  = gratis, pero hay que tener cuenta.
--    subscription = incluido para quien tenga una suscripción activa (de cualquier creadora).
--    paid        = hay que comprarlo individual (comportamiento de hoy, por defecto).
alter table products add column if not exists access_tier text
  check (access_tier in ('public', 'registered', 'subscription', 'paid'))
  not null default 'paid';

-- 2) La suscripción es "de plataforma": no importa cuál de las tres
--    la vendió, cubre el contenido de access_tier = 'subscription'
--    de CUALQUIER creadora. Vigencia real por fecha, no solo "active".
create or replace function public.has_access_to_product(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (select access_tier from products where id = p_product_id) = 'public'
    or (
      (select access_tier from products where id = p_product_id) = 'registered'
      and auth.uid() is not null
    )
    or exists (
      select 1
      from orders o
      where o.product_id = p_product_id
        and o.buyer_id = auth.uid()
        and o.status = 'approved'
    )
    or (
      (select access_tier from products where id = p_product_id) = 'subscription'
      and exists (
        select 1
        from memberships m
        join products mp on mp.id = m.product_id
        where m.buyer_id = auth.uid()
          and m.status = 'active'
          and m.current_period_end > now()
          and mp.type = 'membership'
      )
    );
$$;

-- 3) PRODUCTS: que cualquiera pueda ver el catálogo (título, precio,
--    nivel de acceso) de lo publicado, sin importar el tipo de acceso
--    al CONTENIDO — esto ya lo permitía "products_select_published".
--    No hace falta tocarlo.

-- 4) COURSE_LESSONS: una lección "public" se puede leer sin pasar por
--    has_access_to_product (evita una consulta extra en el caso común).
drop policy if exists "lessons_select_with_access" on course_lessons;
create policy "lessons_select_with_access" on course_lessons for select using (
  is_free_preview = true or public.has_access_to_product(product_id)
);
