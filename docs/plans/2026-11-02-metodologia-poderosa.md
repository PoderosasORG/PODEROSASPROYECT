# Metodología Poderosa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un curso nuevo "Metodología Poderosa" con 3 categorías, cada una administrada por
una de las 3 creadoras desde su propio dispositivo, con video alojado en Bunny.net Stream
(sin descarga, URLs firmadas) y material de apoyo descargable normal.

**Architecture:** Next.js (App Router) + Supabase (Postgres/RLS/Storage) ya existentes. Se
agregan 3 tablas nuevas con RLS por `owner_id` de categoría. El video nunca toca nuestro
servidor ni Supabase: el navegador sube directo a Bunny Stream vía TUS (subida resumable)
usando una firma de un solo uso que genera una API route nuestra; la reproducción pasa por
otra API route que devuelve una URL firmada de corta duración.

**Tech Stack:** Next.js 15 / React / TypeScript, Supabase (`@supabase/ssr`), Bunny.net Stream
(API REST + TUS upload + Token Authentication para reproducción), `tus-js-client` (nuevo,
para la subida resumable desde el navegador).

**Spec:** `docs/specs/metodologia-poderosa-design.md`

**Nota sobre pruebas:** este proyecto no tiene ningún framework de pruebas instalado (sin
jest/vitest/playwright en `package.json`, confirmado). Todo el código existente (login,
checkout, subida de lecciones, etc.) se verifica corriendo el servidor de desarrollo y
probando en el navegador — no hay precedente de pruebas automatizadas que seguir. Este plan
respeta esa convención: cada tarea termina en una verificación manual concreta (qué correr,
qué deberías ver) en vez de inventar una suite de pruebas que no existe en el resto del
proyecto. Donde el código es una función pura sin red (las firmas de Bunny), se verifica con
un script corto de Node que imprime el resultado para inspección, siguiendo el mismo espíritu
de "ver fallar, luego implementar" a mano: primero se corre con datos conocidos y se confirma
que el resultado es el esperado según la documentación de Bunny.

## Global Constraints

- Nunca exponer `BUNNY_STREAM_API_KEY` ni `BUNNY_STREAM_TOKEN_KEY` al navegador — solo se usan
  dentro de API routes de servidor (`src/app/api/**/route.ts`), nunca en componentes `"use client"`.
- Las migraciones SQL se entregan en el chat para que el usuario las pegue en el SQL Editor de
  Supabase — no se ejecutan directamente (regla del proyecto, `CLAUDE.md`).
- Nunca leer ni abrir `.env.local` con las herramientas de archivo — si se necesita confirmar
  que una variable existe, pedir al usuario que confirme o usar `grep -c` sobre el nombre de la
  variable (no su valor).
- Todo el texto de interfaz en español, tono directo, igual que el resto del sitio.
- Seguir los componentes y la paleta visual ya existentes (dorado `gold`/`gold-light`, beige,
  `font-serif`) — no introducir un sistema de diseño nuevo.
- Los módulos en borrador (`is_published = false`) nunca deben ser visibles ni accesibles por
  URL directa para compradores.

## Review Focus

- **Una administradora intenta editar la categoría de otra** (manipulando el formulario o la
  URL): la política RLS de `category_modules`/`course_categories` debe rechazarlo a nivel de
  base de datos, no solo ocultar el botón en la UI.
- **Alguien sin comprar el curso pide la URL de reproducción directamente** (API route de
  playback) copiando la URL de otro módulo: debe devolver 403, no una URL firmada válida.
- **Subida de video que se corta a la mitad** (wifi inestable, cierre accidental de pestaña):
  el módulo no debe quedar visible para compradores con un `bunny_video_id` roto o vacío;
  debe quedar en un estado claramente "incompleto" que la administradora pueda reintentar o
  borrar.
- **Dos módulos con el mismo `order_index`** dentro de la misma categoría (ej. por una carrera
  de clics en "subir/bajar orden"): el orden debe seguir siendo determinístico (desempate
  estable, ej. por `created_at`), no debe duplicar ni perder módulos en la lista.
- **El producto "Metodología Poderosa" está despublicado o el comprador perdió el acceso**
  (reembolso, membresía vencida) después de haber visto módulos antes: la próxima vez que pida
  una URL de reproducción, debe ser rechazado — el acceso se revalida en cada reproducción, no
  se cachea indefinidamente en el cliente.

---

## Task 1: Migración SQL — tablas, RLS y semilla de categorías

**Files:**
- Create: `supabase/metodologia_poderosa_schema.sql`

**Interfaces:**
- Produces: tablas `course_categories`, `category_modules`, `category_module_files` que todas
  las tareas siguientes leen/escriben.

- [ ] **Step 1: Escribir el archivo de migración**

```sql
-- ============================================================
-- Metodología Poderosa: curso compartido entre 3 administradoras,
-- cada una dueña de su propia categoría.
-- Pega esto completo en Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists course_categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  owner_id uuid not null references creators (id) on delete restrict,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists category_modules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references course_categories (id) on delete cascade,
  title text not null,
  description text,
  bunny_video_id text,
  custom_thumbnail_url text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists category_module_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references category_modules (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table course_categories enable row level security;
alter table category_modules enable row level security;
alter table category_module_files enable row level security;

-- COURSE_CATEGORIES
create policy "categories_select_published_product" on course_categories for select using (
  exists (select 1 from products p where p.id = product_id and p.is_published = true)
  or owner_id = auth.uid()
);
create policy "categories_update_own" on course_categories for update using (owner_id = auth.uid());

-- CATEGORY_MODULES: público si publicado y hay acceso al producto; la dueña ve/edita los suyos siempre.
create policy "modules_select_with_access" on category_modules for select using (
  (
    is_published = true
    and exists (
      select 1 from course_categories c
      where c.id = category_id and public.has_access_to_product(c.product_id)
    )
  )
  or exists (
    select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid()
  )
);
create policy "modules_manage_own_category" on category_modules for all using (
  exists (select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from course_categories c where c.id = category_id and c.owner_id = auth.uid())
);

-- CATEGORY_MODULE_FILES: mismas reglas, a través del módulo.
create policy "module_files_select_with_access" on category_module_files for select using (
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
create policy "module_files_manage_own_category" on category_module_files for all using (
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

-- ============================================================
-- SEMILLA: crea el producto "Metodología Poderosa" (dueño = tu
-- cuenta, Oscar) y las 3 categorías. Ajusta el precio si quieres
-- otro antes de pegarlo. Si tu cuenta de Oscar todavía no tiene
-- fila en "creators", esto falla — avísame y la creamos primero.
-- ============================================================
insert into products (creator_id, type, title, description, price_cents, is_published)
select id, 'course', 'Metodología Poderosa',
  'Un curso construido entre las 3: quién soy, qué quiero y cómo lo logro.',
  0, false
from creators where id = auth.uid()
on conflict do nothing
returning id;

-- Nota: correr el INSERT de arriba desde el SQL Editor usa el rol
-- "postgres" (no tu sesión), así que auth.uid() da null ahí. En vez
-- de ese bloque, usa este con el UUID real de Oscar como creador y
-- los UUID reales de Luz/Shei/Kat como dueñas de categoría (los
-- mismos "UID" que se ven en Authentication → Users):

-- insert into products (creator_id, type, title, description, price_cents, is_published)
-- values ('<uuid-de-oscar>', 'course', 'Metodología Poderosa',
--   'Un curso construido entre las 3: quién soy, qué quiero y cómo lo logro.',
--   0, false)
-- returning id;
--
-- insert into course_categories (product_id, owner_id, title, order_index) values
--   ('<id-del-producto-de-arriba>', '<uuid-de-luz>', '¿Quién soy?', 0),
--   ('<id-del-producto-de-arriba>', '<uuid-de-shei>', '¿Qué quiero?', 1),
--   ('<id-del-producto-de-arriba>', '<uuid-de-kat>', '¿Cómo lo logro?', 2);
```

- [ ] **Step 2: Entregar el SQL al usuario en el chat** (no ejecutarlo) y pedirle que confirme
  los UUID reales de Oscar, Luz, Shei y Kat desde Supabase → Authentication → Users antes de
  pegar la parte de la semilla.

- [ ] **Step 3: Commit**

```bash
git add supabase/metodologia_poderosa_schema.sql
git commit -m "Agregar esquema de Metodología Poderosa (categorías y módulos)"
```

---

## Task 2: Cliente de Bunny Stream en el servidor

**Files:**
- Create: `src/lib/bunny/stream.ts`

**Interfaces:**
- Produces:
  - `createBunnyVideo(title: string): Promise<{ videoId: string }>`
  - `createTusUploadAuth(videoId: string): { libraryId: string; expire: number; signature: string }`
  - `getSignedPlaybackUrl(videoId: string): string`
  - `deleteBunnyVideo(videoId: string): Promise<void>`

- [ ] **Step 1: Escribir el archivo**

```typescript
// src/lib/bunny/stream.ts
import crypto from "node:crypto";

const BUNNY_STREAM_API = "https://video.bunnycdn.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export async function createBunnyVideo(title: string): Promise<{ videoId: string }> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  const res = await fetch(`${BUNNY_STREAM_API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Bunny rechazó crear el video (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { guid: string };
  return { videoId: data.guid };
}

export function createTusUploadAuth(videoId: string) {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");
  const expire = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hora para completar la subida

  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return { libraryId, expire, signature };
}

export function getSignedPlaybackUrl(videoId: string): string {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const tokenKey = requireEnv("BUNNY_STREAM_TOKEN_KEY");
  const expires = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos

  const token = crypto
    .createHash("sha256")
    .update(`${tokenKey}${videoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  await fetch(`${BUNNY_STREAM_API}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}
```

- [ ] **Step 2: Verificar las firmas a mano (sin red) antes de seguir**

Correr en una terminal, dentro del proyecto:

```bash
node -e "
const crypto = require('crypto');
const libraryId = '12345';
const apiKey = 'clave-de-prueba';
const videoId = 'video-de-prueba';
const expire = 1700000000;
console.log('TUS signature:', crypto.createHash('sha256').update(libraryId+apiKey+expire+videoId).digest('hex'));
"
```

Expected: imprime un hash hex de 64 caracteres. Confirma a mano contra
`docs.bunny.net/stream/upload-videos` (sección TUS / Authentication Signature) que la fórmula
es exactamente `sha256(library_id + api_key + expiration_time + video_id)` antes de dar la
tarea por terminada — si Bunny cambió el formato, ajustar aquí antes de seguir a la Tarea 3.

- [ ] **Step 3: Pedirle al usuario la clave de "Token Authentication"**

Esta es distinta de la API key general. En Bunny: Stream → tu Video Library → **Security** →
activar "Token Authentication" → copiar la "Authentication Key" que aparece ahí. Pedirle al
usuario que la agregue a `.env.local` como `BUNNY_STREAM_TOKEN_KEY=` (igual que hicimos con las
otras dos variables, sin pegarla en el chat).

- [ ] **Step 4: Commit**

```bash
git add src/lib/bunny/stream.ts
git commit -m "Agregar cliente de Bunny Stream (crear video, firma TUS, URL firmada)"
```

---

## Task 3: Tipos compartidos

**Files:**
- Create: `src/lib/metodologiaPoderosa.ts`

**Interfaces:**
- Produces: `CourseCategory`, `CategoryModule`, `CategoryModuleFile` — usados por todas las
  tareas de UI y API routes siguientes.

- [ ] **Step 1: Escribir el archivo**

```typescript
// src/lib/metodologiaPoderosa.ts
export type CourseCategory = {
  id: string;
  product_id: string;
  owner_id: string;
  title: string;
  order_index: number;
};

export type CategoryModule = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  custom_thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
};

export type CategoryModuleFile = {
  id: string;
  module_id: string;
  file_path: string;
  file_name: string;
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados con este archivo (puede haber otros preexistentes;
confirmar que no aumentan).

- [ ] **Step 3: Commit**

```bash
git add src/lib/metodologiaPoderosa.ts
git commit -m "Agregar tipos de Metodología Poderosa"
```

---

## Task 4: API route — autorización de subida (TUS)

**Files:**
- Create: `src/app/api/panel/metodologia/upload-auth/route.ts`

**Interfaces:**
- Consumes: `createBunnyVideo`, `createTusUploadAuth` (Task 2); `createClient` de
  `@/lib/supabase/server` (patrón ya usado en `src/app/auth/confirm/route.ts`).
- Produces: `POST /api/panel/metodologia/upload-auth` — body `{ categoryId: string, title: string }`,
  respuesta `{ videoId, libraryId, expire, signature }` o error 401/403/400.

- [ ] **Step 1: Escribir la ruta**

```typescript
// src/app/api/panel/metodologia/upload-auth/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBunnyVideo, createTusUploadAuth } from "@/lib/bunny/stream";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { categoryId?: string; title?: string }
    | null;
  if (!body?.categoryId || !body?.title?.trim()) {
    return NextResponse.json({ error: "Falta categoryId o title" }, { status: 400 });
  }

  const { data: category } = await supabase
    .from("course_categories")
    .select("id, owner_id")
    .eq("id", body.categoryId)
    .maybeSingle();

  if (!category || category.owner_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso sobre esta categoría" }, { status: 403 });
  }

  try {
    const { videoId } = await createBunnyVideo(body.title.trim());
    const auth = createTusUploadAuth(videoId);
    return NextResponse.json({ videoId, ...auth });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo preparar la subida" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Verificación manual con el servidor corriendo**

```bash
npm run dev
```

En otra terminal, sin sesión (debe dar 401):

```bash
curl -i -X POST http://localhost:3000/api/panel/metodologia/upload-auth \
  -H "Content-Type: application/json" \
  -d "{\"categoryId\":\"00000000-0000-0000-0000-000000000000\",\"title\":\"prueba\"}"
```

Expected: `HTTP/1.1 401` con `{"error":"No autenticado"}`. (La prueba con sesión real y
`categoryId` válido se hace en la Tarea 9, una vez exista el formulario y la semilla de
categorías de la Tarea 1 esté pegada en Supabase.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/panel/metodologia/upload-auth/route.ts
git commit -m "Agregar API route de autorización de subida a Bunny"
```

---

## Task 5: API route — URL firmada de reproducción

**Files:**
- Create: `src/app/api/metodologia-poderosa/[moduleId]/playback/route.ts`

**Interfaces:**
- Consumes: `getSignedPlaybackUrl` (Task 2); `has_access_to_product` (función SQL ya existente).
- Produces: `GET /api/metodologia-poderosa/[moduleId]/playback` → `{ url: string }` o 403/404.

- [ ] **Step 1: Escribir la ruta**

```typescript
// src/app/api/metodologia-poderosa/[moduleId]/playback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedPlaybackUrl } from "@/lib/bunny/stream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("category_modules")
    .select("id, bunny_video_id, is_published")
    .eq("id", moduleId)
    .maybeSingle();

  if (!module || !module.bunny_video_id) {
    return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
  }

  // RLS en category_modules ya exige is_published + acceso al producto (o ser la dueña),
  // así que si la fila se pudo leer, el acceso es válido. Si no se pudo leer, el select
  // anterior devuelve null por la política, y ya respondimos 404 arriba.

  return NextResponse.json({ url: getSignedPlaybackUrl(module.bunny_video_id) });
}
```

- [ ] **Step 2: Verificación manual**

```bash
curl -i http://localhost:3000/api/metodologia-poderosa/00000000-0000-0000-0000-000000000000/playback
```

Expected: `HTTP/1.1 404` con `{"error":"Módulo no encontrado"}` (no existe ese id todavía).
La prueba con un módulo real y comprador real se hace en la Tarea 11.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/metodologia-poderosa/[moduleId]/playback/route.ts"
git commit -m "Agregar API route de reproducción firmada"
```

---

## Task 6: Botón de entrada en /panel

**Files:**
- Modify: `src/app/panel/page.tsx`

**Interfaces:**
- Consumes: tabla `course_categories` (Task 1).

- [ ] **Step 1: Agregar la consulta y el botón**

En `src/app/panel/page.tsx`, después de la consulta de `creator` (línea ~27), agregar:

```typescript
  const { data: ownedCategory } = await supabase
    .from("course_categories")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
```

Dentro del bloque `{creator ? (...)}`, en el `<div className="flex gap-3">` de botones
(línea ~59), agregar antes del cierre del `div`:

```tsx
            {ownedCategory && (
              <Link
                href="/panel/metodologia-poderosa"
                className="rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
              >
                METODOLOGÍA PODEROSA — Cargar material del curso
              </Link>
            )}
```

- [ ] **Step 2: Verificación manual en el navegador**

```bash
npm run dev
```

Abrir `http://localhost:3000/panel` con una cuenta que NO sea dueña de ninguna categoría
todavía (todas, hasta que se pegue la semilla de la Tarea 1): el botón no debe aparecer.
Expected: sin errores en consola, resto del panel igual que antes.

- [ ] **Step 3: Commit**

```bash
git add src/app/panel/page.tsx
git commit -m "Agregar botón de Metodología Poderosa al panel (condicional a ser dueña de categoría)"
```

---

## Task 7: Página admin + editor de nombre de categoría

**Files:**
- Create: `src/app/panel/metodologia-poderosa/page.tsx`
- Create: `src/components/panel/metodologia/CategoryTitleEditor.tsx`

**Interfaces:**
- Consumes: `CourseCategory`, `CategoryModule` (Task 3).
- Produces: estructura de página que la Tarea 8 (lista) y la Tarea 9 (formulario) llenan.

- [ ] **Step 1: Editor de título (cliente)**

```tsx
// src/components/panel/metodologia/CategoryTitleEditor.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CategoryTitleEditor({ categoryId, initialTitle }: { categoryId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (!title.trim() || title === initialTitle) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("course_categories").update({ title: title.trim() }).eq("id", categoryId);
    setSaving(false);
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={handleBlur}
      disabled={saving}
      className="font-serif text-2xl bg-transparent border-b border-gold-light/60 focus:border-gold outline-none px-1"
    />
  );
}
```

- [ ] **Step 2: Página del panel (servidor)**

```tsx
// src/app/panel/metodologia-poderosa/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryTitleEditor } from "@/components/panel/metodologia/CategoryTitleEditor";
import { ModuleList } from "@/components/panel/metodologia/ModuleList";

export default async function MetodologiaPoderosaPanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/panel/metodologia-poderosa");

  const { data: category } = await supabase
    .from("course_categories")
    .select("id, title")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!category) redirect("/panel");

  const { data: modules } = await supabase
    .from("category_modules")
    .select("id, title, description, bunny_video_id, custom_thumbnail_url, order_index, is_published")
    .eq("category_id", category.id)
    .order("order_index");

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex flex-col gap-2">
        <p className="text-sm text-foreground/60">Metodología Poderosa — tu categoría</p>
        <CategoryTitleEditor categoryId={category.id} initialTitle={category.title} />
      </div>

      <ModuleList categoryId={category.id} initialModules={modules ?? []} />
    </div>
  );
}
```

(`ModuleList` se implementa en la Tarea 8 — este archivo importa un componente que todavía no
existe; se deja así a propósito, igual que haría cualquier desarrollador construyendo de
arriba hacia abajo, y la Tarea 8 lo crea antes de que esta página se vuelva a probar.)

- [ ] **Step 3: Commit**

```bash
git add src/app/panel/metodologia-poderosa/page.tsx src/components/panel/metodologia/CategoryTitleEditor.tsx
git commit -m "Agregar página admin de Metodología Poderosa y editor de título de categoría"
```

---

## Task 8: Lista de módulos (editar/eliminar/orden)

**Files:**
- Create: `src/components/panel/metodologia/ModuleList.tsx`

**Interfaces:**
- Consumes: `CategoryModule` (Task 3).
- Produces: `<ModuleList categoryId initialModules />`, usado por la Tarea 7. Al editar, abre
  `ModuleForm` (Task 9) en modo edición.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/components/panel/metodologia/ModuleList.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";
import { ModuleForm } from "./ModuleForm";

export function ModuleList({
  categoryId,
  initialModules,
}: {
  categoryId: string;
  initialModules: CategoryModule[];
}) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [editing, setEditing] = useState<CategoryModule | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(module: CategoryModule) {
    if (!confirm(`¿Borrar el módulo "${module.title}"? Esto no se puede deshacer.`)) return;
    setBusyId(module.id);
    const supabase = createClient();
    await supabase.from("category_modules").delete().eq("id", module.id);
    setModules((prev) => prev.filter((m) => m.id !== module.id));
    setBusyId(null);
  }

  async function handleMove(module: CategoryModule, direction: -1 | 1) {
    const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
    const index = sorted.findIndex((m) => m.id === module.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;

    setBusyId(module.id);
    const supabase = createClient();
    await Promise.all([
      supabase.from("category_modules").update({ order_index: swapWith.order_index }).eq("id", module.id),
      supabase.from("category_modules").update({ order_index: module.order_index }).eq("id", swapWith.id),
    ]);
    router.refresh();
    setBusyId(null);
  }

  if (editing) {
    return (
      <ModuleForm
        categoryId={categoryId}
        existing={editing === "new" ? null : editing}
        nextOrderIndex={modules.length ? Math.max(...modules.map((m) => m.order_index)) + 1 : 0}
        onDone={(saved) => {
          setModules((prev) => {
            const withoutSaved = prev.filter((m) => m.id !== saved.id);
            return [...withoutSaved, saved];
          });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-3">
        <h2 className="font-serif text-lg">Módulos de tu categoría</h2>
        {sorted.length === 0 && (
          <p className="text-sm text-foreground/60">Todavía no hay módulos — agrega el primero abajo.</p>
        )}
        {sorted.map((module, index) => (
          <div key={module.id} className="flex items-center gap-2 border-b border-gold-light/30 pb-2 last:border-0">
            <div className="flex flex-col">
              <button
                onClick={() => handleMove(module, -1)}
                disabled={busyId === module.id || index === 0}
                className="text-xs disabled:opacity-30"
                aria-label="Subir"
              >
                ▲
              </button>
              <button
                onClick={() => handleMove(module, 1)}
                disabled={busyId === module.id || index === sorted.length - 1}
                className="text-xs disabled:opacity-30"
                aria-label="Bajar"
              >
                ▼
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{module.title}</p>
              <p className="text-xs text-foreground/50">
                {module.is_published ? "Publicado" : "Borrador"}
                {!module.bunny_video_id && " · video sin terminar de subir"}
              </p>
            </div>
            <button
              onClick={() => setEditing(module)}
              disabled={busyId === module.id}
              className="text-xs text-gold hover:underline disabled:opacity-50"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(module)}
              disabled={busyId === module.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEditing("new")}
        className="self-start rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
      >
        Cargar material
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificación manual en el navegador**

(Requiere que la Tarea 9 exista para que el archivo compile — `ModuleForm` se crea ahí mismo a
continuación; si se ejecuta este plan en orden con subagentes, la Tarea 8 queda con un import
roto hasta que termine la Tarea 9. Eso es aceptable dentro de una misma rama de trabajo antes
de abrir PR; el checkpoint real de "compila y funciona en el navegador" es al final de la
Tarea 9.)

- [ ] **Step 3: Commit**

```bash
git add src/components/panel/metodologia/ModuleList.tsx
git commit -m "Agregar lista de módulos con editar/eliminar/reordenar"
```

---

## Task 9: Formulario de carga (wizard) — el corazón de la feature

**Files:**
- Create: `src/components/panel/metodologia/ModuleForm.tsx`
- Modify: `package.json` (agregar `tus-js-client`)

**Interfaces:**
- Consumes: `POST /api/panel/metodologia/upload-auth` (Task 4), `CategoryModule`,
  `CategoryModuleFile` (Task 3).
- Produces: `<ModuleForm categoryId existing nextOrderIndex onDone onCancel />`, usado por
  `ModuleList` (Task 8).

- [ ] **Step 1: Instalar la dependencia de subida resumable**

```bash
npm install tus-js-client
```

- [ ] **Step 2: Escribir el componente**

```tsx
// src/components/panel/metodologia/ModuleForm.tsx
"use client";

import { useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";

type Props = {
  categoryId: string;
  existing: CategoryModule | null;
  nextOrderIndex: number;
  onDone: (saved: CategoryModule) => void;
  onCancel: () => void;
};

export function ModuleForm({ categoryId, existing, nextOrderIndex, onDone, onCancel }: Props) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [orderIndex, setOrderIndex] = useState(existing?.order_index ?? nextOrderIndex);
  const [hasSupportMaterial, setHasSupportMaterial] = useState(false);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bunnyVideoId, setBunnyVideoId] = useState(existing?.bunny_video_id ?? null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadVideoToBunny(file: File): Promise<string> {
    const authRes = await fetch("/api/panel/metodologia/upload-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, title: title.trim() || file.name }),
    });
    if (!authRes.ok) {
      const body = await authRes.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(body.error ?? "No se pudo preparar la subida");
    }
    const auth = (await authRes.json()) as {
      videoId: string;
      libraryId: string;
      expire: number;
      signature: string;
    };

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          AuthorizationSignature: auth.signature,
          AuthorizationExpire: String(auth.expire),
          VideoId: auth.videoId,
          LibraryId: auth.libraryId,
        },
        metadata: { filetype: file.type, title: title.trim() || file.name },
        onError: reject,
        onProgress: (sent, total) => setUploadProgress(Math.round((sent / total) * 100)),
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    return auth.videoId;
  }

  async function handleSubmit(publish: boolean) {
    if (!title.trim()) {
      setError("Ponle un título al módulo.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let videoId = bunnyVideoId;
      if (videoFile) {
        setUploadProgress(0);
        videoId = await uploadVideoToBunny(videoFile);
        setBunnyVideoId(videoId);
        setUploadProgress(null);
      }
      if (!videoId) {
        setError("Elige un video antes de guardar.");
        setSaving(false);
        return;
      }

      const supabase = createClient();

      let customThumbnailUrl = existing?.custom_thumbnail_url ?? null;
      if (thumbnailFile) {
        const path = `${categoryId}/${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage.from("covers").upload(path, thumbnailFile);
        if (thumbError) throw thumbError;
        customThumbnailUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      const row = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || null,
        bunny_video_id: videoId,
        custom_thumbnail_url: customThumbnailUrl,
        order_index: orderIndex,
        is_published: publish,
      };

      const { data: savedModule, error: saveError } = existing
        ? await supabase.from("category_modules").update(row).eq("id", existing.id).select().single()
        : await supabase.from("category_modules").insert(row).select().single();

      if (saveError) throw saveError;

      if (hasSupportMaterial && supportFile) {
        const filePath = `${savedModule.id}/${Date.now()}-${supportFile.name}`;
        const { error: uploadError } = await supabase.storage.from("product-files").upload(filePath, supportFile);
        if (uploadError) throw uploadError;
        await supabase.from("category_module_files").insert({
          module_id: savedModule.id,
          file_path: filePath,
          file_name: supportFile.name,
        });
      }

      onDone(savedModule as CategoryModule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el módulo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-4">
      <h2 className="font-serif text-xl">{existing ? "Editar módulo" : "Cargar material"}</h2>

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-3 py-2"
          rows={3}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {bunnyVideoId ? "Reemplazar video (opcional)" : "Video"}
        <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
      </label>
      {uploadProgress !== null && (
        <p className="text-xs text-foreground/60">Subiendo video: {uploadProgress}%</p>
      )}

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">¿Tiene material de apoyo?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={hasSupportMaterial}
              onChange={() => setHasSupportMaterial(true)}
            />
            Sí
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={!hasSupportMaterial}
              onChange={() => setHasSupportMaterial(false)}
            />
            No
          </label>
        </div>
        {hasSupportMaterial && (
          <input
            type="file"
            onChange={(e) => setSupportFile(e.target.files?.[0] ?? null)}
          />
        )}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Orden (0 = primero)
        <input
          type="number"
          min={0}
          value={orderIndex}
          onChange={(e) => setOrderIndex(Number(e.target.value))}
          className="rounded border px-3 py-2 w-24"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Miniatura personalizada (opcional — si no eliges una, se usa un fotograma automático)
        <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="rounded-full border border-gold px-5 py-2 text-gold text-sm hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
        >
          Guardar como borrador
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          Publicar
        </button>
        <button onClick={onCancel} disabled={saving} className="text-sm text-foreground/60 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificación manual completa en el navegador**

Requiere que la Tarea 1 (semilla de categorías con UUID reales) ya esté pegada en Supabase.

```bash
npm run dev
```

1. Entrar a `http://localhost:3000/login` con la cuenta de una de las 3 administradoras (ej.
   `planesks@gmail.com`).
2. Ir a `/panel` → confirmar que aparece el botón "METODOLOGÍA PODEROSA — Cargar material del curso".
3. Entrar, dar clic en "Cargar material", llenar título + elegir un video de prueba corto
   (unos segundos, no hace falta uno real de 8 minutos para probar el flujo) + "Publicar".
4. Confirmar que la barra de progreso avanza y que, al terminar, el módulo aparece en la lista
   como "Publicado".
5. En `read_network_requests` o la pestaña Network del navegador, confirmar que la llamada a
   `tusupload` fue directo a `video.bunnycdn.com` (no pasó por `localhost:3000`).
6. Entrar al dashboard de Bunny (Stream → la Video Library) y confirmar que el video aparece
   ahí con el título correcto.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/panel/metodologia/ModuleForm.tsx
git commit -m "Agregar wizard de carga de módulos (video a Bunny + material de apoyo)"
```

---

## Task 10: Página del visor del curso (gate de acceso + layout)

**Files:**
- Create: `src/app/cursos/metodologia-poderosa/page.tsx`

**Interfaces:**
- Consumes: `has_access_to_product` (SQL existente), `CourseCategory`, `CategoryModule`.
- Produces: estructura que la Tarea 11 completa con el reproductor interactivo.

- [ ] **Step 1: Escribir la página**

```tsx
// src/app/cursos/metodologia-poderosa/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { CourseViewer } from "@/components/cursos/CourseViewer";

export default async function MetodologiaPoderosaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price_cents, cover_image_url")
    .eq("title", "Metodología Poderosa")
    .maybeSingle();

  if (!product) {
    return (
      <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
        <p className="text-foreground/60">Este curso todavía no está disponible.</p>
      </div>
    );
  }

  const { data: hasAccess } = await supabase.rpc("has_access_to_product", { p_product_id: product.id });

  if (!user || !hasAccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-beige-light px-6 py-24 gap-6 text-center">
        <h1 className="font-serif text-3xl">{product.title}</h1>
        <p className="text-foreground/70 max-w-md">{product.description}</p>
        {!user ? (
          <a href={`/login?next=/cursos/metodologia-poderosa`} className="text-gold hover:underline">
            Inicia sesión para comprarlo
          </a>
        ) : (
          <BuyButton productId={product.id} priceCents={product.price_cents} />
        )}
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("course_categories")
    .select("id, title, order_index")
    .eq("product_id", product.id)
    .order("order_index");

  const { data: modules } = await supabase
    .from("category_modules")
    .select("id, category_id, title, description, custom_thumbnail_url, order_index, is_published")
    .in("category_id", (categories ?? []).map((c) => c.id))
    .eq("is_published", true)
    .order("order_index");

  if (!categories || categories.length === 0) {
    redirect("/panel");
  }

  return <CourseViewer categories={categories} modules={modules ?? []} />;
}
```

Nota: revisar la firma real de `BuyButton` (`src/components/BuyButton.tsx`) antes de este paso
— si espera props distintas a `productId`/`priceCents`, ajustar la llamada para que coincida
exactamente (no inventar props nuevas sin mirar el componente existente).

- [ ] **Step 2: Verificación manual**

Entrar a `/cursos/metodologia-poderosa` sin sesión: debe mostrar la portada con botón de login,
sin ningún dato de categorías/módulos en la respuesta (confirmar con `read_page`, no debe
aparecer texto de ningún módulo en el HTML).

- [ ] **Step 3: Commit**

```bash
git add src/app/cursos/metodologia-poderosa/page.tsx
git commit -m "Agregar página del curso con gate de acceso"
```

---

## Task 11: Sidebar de categorías + reproductor seguro

**Files:**
- Create: `src/components/cursos/CourseViewer.tsx`
- Create: `src/components/cursos/ModulePlayer.tsx`

**Interfaces:**
- Consumes: `GET /api/metodologia-poderosa/[moduleId]/playback` (Task 5), `CourseCategory`,
  `CategoryModule` (Task 3).

- [ ] **Step 1: Reproductor (cliente)**

```tsx
// src/components/cursos/ModulePlayer.tsx
"use client";

import { useEffect, useState } from "react";
import type { CategoryModule, CategoryModuleFile } from "@/lib/metodologiaPoderosa";
import { createClient } from "@/lib/supabase/client";

type PlayableModule = Pick<CategoryModule, "id" | "title" | "description">;

export function ModulePlayer({ module }: { module: PlayableModule }) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<CategoryModuleFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaybackUrl(null);
    setError(null);

    fetch(`/api/metodologia-poderosa/${module.id}/playback`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No tienes acceso a este video.");
        return res.json() as Promise<{ url: string }>;
      })
      .then((data) => setPlaybackUrl(data.url))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el video"));

    const supabase = createClient();
    supabase
      .from("category_module_files")
      .select("id, module_id, file_path, file_name")
      .eq("module_id", module.id)
      .then(({ data }) => setFiles(data ?? []));
  }, [module.id]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <h1 className="font-serif text-2xl">{module.title}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !playbackUrl && <p className="text-sm text-foreground/60">Cargando video...</p>}
      {playbackUrl && (
        <div className="aspect-video w-full">
          <iframe
            src={playbackUrl}
            loading="lazy"
            className="w-full h-full rounded-xl"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {module.description && <p className="text-foreground/70">{module.description}</p>}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg">Material de apoyo</h2>
          {files.map((file) => (
            <ModuleFileLink key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleFileLink({ file }: { file: CategoryModuleFile }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("product-files")
      .createSignedUrl(file.file_path, 60 * 10)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [file.file_path]);

  if (!url) return <p className="text-sm text-foreground/40">{file.file_name} (cargando...)</p>;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-gold hover:underline">
      Descargar: {file.file_name}
    </a>
  );
}
```

- [ ] **Step 2: Sidebar + estado seleccionado (cliente)**

```tsx
// src/components/cursos/CourseViewer.tsx
"use client";

import { useState } from "react";
import type { CategoryModule, CourseCategory } from "@/lib/metodologiaPoderosa";
import { ModulePlayer } from "./ModulePlayer";

type SidebarCategory = Pick<CourseCategory, "id" | "title" | "order_index">;
type SidebarModule = Pick<
  CategoryModule,
  "id" | "category_id" | "title" | "description" | "custom_thumbnail_url" | "order_index" | "is_published"
>;

export function CourseViewer({
  categories,
  modules,
}: {
  categories: SidebarCategory[];
  modules: SidebarModule[];
}) {
  const [selected, setSelected] = useState<SidebarModule | null>(modules[0] ?? null);

  return (
    <div className="flex flex-1 flex-col md:flex-row bg-beige-light">
      <aside className="w-full md:w-72 bg-white border-r border-gold-light/40 p-4 flex flex-col gap-4">
        <h2 className="font-serif text-xl">Metodología Poderosa</h2>
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gold">{category.title}</p>
            {modules
              .filter((m) => m.category_id === category.id)
              .map((module) => (
                <button
                  key={module.id}
                  onClick={() => setSelected(module)}
                  className={`text-left text-sm px-2 py-1.5 rounded ${
                    selected?.id === module.id ? "bg-gold-light/40 font-medium" : "hover:bg-beige-light"
                  }`}
                >
                  {module.title}
                </button>
              ))}
          </div>
        ))}
      </aside>

      <main className="flex-1 p-6">
        {selected ? <ModulePlayer module={selected} /> : <p>Todavía no hay módulos publicados.</p>}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verificación manual completa (end-to-end)**

Con la cuenta de un comprador real (o dándote acceso de prueba insertando una fila en `orders`
con `status = 'approved'` para ese producto, desde el SQL Editor):

1. Entrar a `/cursos/metodologia-poderosa` → debe verse el sidebar con las 3 categorías y sus
   módulos publicados.
2. Dar clic en un módulo → el reproductor debe cargar y reproducir.
3. Con `read_network_requests`, confirmar que la URL del iframe tiene `token=` y `expires=` en
   la query string (no un link plano sin firmar).
4. Copiar esa URL firmada, esperar a que pase el tiempo de expiración configurado (10 minutos
   en `getSignedPlaybackUrl`) y volver a abrirla directo en una pestaña nueva: debe fallar.
5. Si hay material de apoyo, confirmar que el link de descarga funciona.
6. Clic derecho sobre el video: confirmar que no aparece opción de "Guardar video como".

- [ ] **Step 4: Commit**

```bash
git add src/components/cursos/CourseViewer.tsx src/components/cursos/ModulePlayer.tsx
git commit -m "Agregar visor del curso (sidebar de categorías + reproductor firmado)"
```

---

## Task 12: Verificación final de Review Focus y cierre de rama

**Files:** (ninguno nuevo — solo verificación)

- [ ] **Step 1: Repasar cada punto de "Review Focus" contra lo construido**

- Intentar editar/borrar un módulo de OTRA categoría cambiando el `categoryId` a mano en una
  llamada directa a Supabase desde la consola del navegador, logueado como una administradora
  que no es dueña: debe fallar por RLS (no por validación de UI).
- Pedir `GET /api/metodologia-poderosa/<id-de-un-módulo-de-otra-persona>/playback` sin haber
  comprado el curso: debe dar 404 (la fila no es visible por RLS) o 403.
- Simular una subida cortada (cerrar la pestaña a mitad de la barra de progreso en la Tarea 9):
  confirmar que el módulo queda visible en la lista de la administradora con la nota "video sin
  terminar de subir" y sin aparecer nunca para un comprador (no tiene `bunny_video_id`, y aunque
  lo tuviera, `is_published` sigue en `false` hasta que ella le dé Publicar).
- Revisar que el botón subir/bajar orden (Tarea 8) no duplica `order_index` tras varios clics
  seguidos — probarlo 5-6 veces rápido y confirmar que la lista sigue teniendo un orden válido
  sin dos módulos mostrando el mismo número.
- Revocar el acceso de un comprador de prueba (poner su fila de `orders` en `status = 'declined'`
  desde el SQL Editor) y confirmar que la próxima llamada a `/playback` ya no funciona, aunque
  el navegador tuviera una URL vieja guardada.

- [ ] **Step 2: Abrir el PR**

```bash
git push -u origin <nombre-de-la-rama>
gh pr create --title "Agregar Metodología Poderosa (curso multi-administradora)" --body "Implementa docs/specs/metodologia-poderosa-design.md y docs/plans/2026-11-02-metodologia-poderosa.md"
```

- [ ] **Step 3: Pedir al usuario que revise y autorice el merge**, y que pegue la migración de
  la Tarea 1 en Supabase antes o justo después del merge (el código no rompe nada si las tablas
  no existen todavía para otros productos, pero `/panel/metodologia-poderosa` y el botón del
  panel no funcionarán hasta que la migración esté pegada).
