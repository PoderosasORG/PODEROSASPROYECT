-- ============================================================
-- CRM: personas que asisten SIN compra (costo cero):
--   invitada_especial = invitadas VIP (influencers, creadoras de contenido)
--   equipo            = equipo logístico de PODEROSAS
-- No modifica las compras (orders).
-- ============================================================

create table if not exists admin_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  city text,
  country text,
  contact_type text not null check (contact_type in ('invitada_especial', 'equipo')),
  subtype text,            -- ej. "Influencer / creadora de contenido", "Fotógrafo"
  event_name text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table admin_contacts enable row level security;
drop policy if exists "admin_contacts_all" on admin_contacts;
create policy "admin_contacts_all" on admin_contacts for all
  using (public.is_poderosas_admin()) with check (public.is_poderosas_admin());

-- Los datos (nombres y celulares) NO se guardan en el repo porque es público:
-- se cargan con un SQL aparte que Kat corre en Supabase.
