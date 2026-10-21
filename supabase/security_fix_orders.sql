-- ============================================================
-- ARREGLO DE SEGURIDAD REAL: hoy cualquier usuario con cuenta puede
-- insertar una orden directamente vía la API pública de Supabase
-- (sin pasar por el sitio) con status = 'approved' y amount_cents
-- cualquiera — eso le da acceso real a contenido pago sin pagar.
--
-- La política de insert solo validaba "esta orden es mía", no qué
-- valores trae. La corrección: desde el cliente (anon/authenticated)
-- solo se puede crear una orden en estado 'pending' — pasar a
-- 'approved' SOLO lo puede hacer el servidor (service role, usado por
-- el webhook de Wompi, que valida la firma de Wompi antes).
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

drop policy if exists "orders_insert_own_buyer" on orders;
create policy "orders_insert_own_buyer" on orders for insert
  with check (auth.uid() = buyer_id and status = 'pending');

-- Por si alguna vez se agrega una policy de UPDATE para compradores
-- en el futuro (hoy no existe ninguna — solo el servidor actualiza
-- status), esta regla evita que se cuele un "status=approved" por ahí
-- también. No pasa nada si esta tabla ya no tiene políticas de update.
drop policy if exists "orders_update_own_buyer" on orders;

-- ============================================================
-- Segundo hallazgo (impacto bajo, pero se cierra igual): la política
-- "profiles_update_own" deja cambiar CUALQUIER columna de la propia
-- fila, incluido "role" — un usuario podría ponerse role='creator' a
-- mano. Hoy eso no le da nada real (no puede crear productos sin una
-- fila en "creators", que solo se crea a mano), pero igual conviene
-- que nadie pueda tocar su propio rol.
-- ============================================================
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo bloquea el cambio cuando lo hace el propio dueño de la fila
  -- (una sesión normal). El service role (admin, usado para promover
  -- manualmente a una creadora) no tiene auth.uid() y pasa sin tocar.
  if auth.uid() = old.id and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_role_on_self_update on profiles;
create trigger lock_role_on_self_update
  before update on profiles
  for each row
  execute function public.prevent_self_role_change();
