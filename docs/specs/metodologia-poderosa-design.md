# Metodología Poderosa — curso compartido entre las 3 administradoras

Fecha: 2026-11-02
Estado: aprobado por el usuario en brainstorming, listo para plan de implementación.

## Contexto y objetivo

Poderosas.org ya tiene un sistema de productos/cursos de un solo dueño (`products.creator_id`).
Se necesita un curso nuevo, "Metodología Poderosa", organizado en 3 categorías fijas, cada una
administrada por una persona distinta (Luz, Shei, Kat), cada una subiendo material desde su
propio dispositivo sin depender de las otras ni de un solo punto de carga. El curso es un
producto de pago nuevo, con precio propio, visible completo solo para quien lo compre.

Requisito explícito del dueño del producto: el contenido en video debe ser difícil de descargar
o redistribuir fuera de poderosas.org. No existe protección 100% contra grabación de pantalla
(ninguna plataforma la tiene), así que el diseño apunta a lo que sí es real: sin links públicos
descargables, URLs firmadas que expiran, sin botón de descarga, sin clic derecho.

## Decisiones ya tomadas (brainstorming)

- **Hosting de video:** Bunny.net Stream (Video Library ya creada, ID y API key ya están en
  `.env.local` como `BUNNY_STREAM_LIBRARY_ID` y `BUNNY_STREAM_API_KEY`). Elegido sobre YouTube
  (YouTube no listado se puede descargar y fuga el contenido fuera del paywall) y sobre
  Cloudflare Stream (mínimo de $5/mes desde el día uno vs. $1/mes de Bunny, pago por uso real).
- **Venta:** producto nuevo de pago, con su propio precio en COP, igual que el resto del catálogo.
- **Dueño del producto:** el perfil de Oscar (admin de la plataforma) es el `creator_id` técnico
  en `products`. Precio, título general y publicar/despublegar el curso completo: solo Oscar,
  manualmente por ahora (sin UI nueva para eso).
- **Dueña de cada categoría:** Luz (`luzart05@hotmail.com`) → "¿Quién soy?"; Shei
  (`sheirivera@outlook.com`) → "¿Qué quiero?"; Kat (`planesks@gmail.com`) → "¿Cómo lo logro?".
  Cada una puede renombrar el título de SU categoría, y agregar/editar/borrar módulos dentro de
  ella. No puede tocar las otras 2 categorías.
- **Material de apoyo (PDF/txt/etc.):** descargable normal, igual que los `product_files` que ya
  existen hoy (Supabase Storage, bucket `product-files`, 50 MB máx. por archivo — suficiente para
  documentos, no para video). Se pregunta "¿tiene material de apoyo?" en CADA módulo que se sube,
  no una sola vez por categoría.
- **Miniatura:** automática (un fotograma que genera Bunny.net) por defecto; cada administradora
  puede opcionalmente subir una miniatura propia para un módulo.
- **UI del visor del curso:** estilo tipo Udemy/Platzi (menú de categorías expandible + reproductor
  grande), con la identidad visual ya existente del sitio (dorado/crema/serif, mismos componentes
  que el resto de poderosas.org).

## Modelo de datos

### Tabla nueva: `course_categories`

```sql
create table course_categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  owner_id uuid not null references creators (id) on delete restrict,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
```

- `product_id`: el producto "Metodología Poderosa" (uno solo, pero el modelo soporta más
  productos multi-categoría a futuro sin cambios).
- `owner_id`: la creadora dueña de esa categoría (Luz/Shei/Kat). Referencia `creators`, no
  `profiles`, igual que `products.creator_id`.
- Semilla inicial: 3 filas (ver sección "Migración / semilla" abajo).

### Tabla nueva: `category_modules`

```sql
create table category_modules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references course_categories (id) on delete cascade,
  title text not null,
  description text,
  bunny_video_id text,              -- id del video en Bunny Stream (null hasta que termine de subir)
  custom_thumbnail_url text,        -- null = usar la miniatura automática de Bunny
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
```

### Tabla nueva: `category_module_files` (material de apoyo, 0 o varios por módulo)

```sql
create table category_module_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references category_modules (id) on delete cascade,
  file_path text not null,   -- ruta dentro del bucket product-files existente
  file_name text not null,
  created_at timestamptz not null default now()
);
```

Reutiliza el bucket de Storage `product-files` que ya existe (no hace falta un bucket nuevo),
guardando bajo una ruta tipo `{module_id}/{filename}`.

### RLS (seguridad por fila)

- `course_categories`:
  - `select`: cualquiera puede leer las categorías de un producto publicado (igual que hoy con
    `products_select_published`), más la dueña de la categoría puede leer la suya aunque el
    producto esté despublicado.
  - `update`: solo `owner_id = auth.uid()` (renombrar su categoría).
  - `insert`/`delete`: ninguna de las 3 por ahora — las 3 categorías las crea Oscar a mano al
    arrancar (semilla SQL). Si más adelante se necesita agregar categorías desde la UI, es un
    cambio aparte.
- `category_modules`:
  - `select`: público si `is_published = true` y el usuario tiene acceso al producto (reutiliza
    `has_access_to_product`); la dueña de la categoría puede leer/editar los suyos aunque estén
    en borrador.
  - `insert`/`update`/`delete`: solo si `auth.uid()` es la `owner_id` de la categoría a la que
    pertenece el módulo.
- `category_module_files`: mismas reglas que `category_modules`, a través del `module_id`.

No se modifica la política de `products` existente (`products_update_own` sigue exigiendo
`creator_id = auth.uid()`, que será Oscar).

## Subida de video a Bunny.net (flujo técnico)

1. El navegador de la administradora pide a nuestro servidor (ruta API de Next.js) crear un
   "video" en Bunny Stream para su categoría. El servidor usa `BUNNY_STREAM_API_KEY` (nunca
   expuesta al navegador) para crear el video vía la API de Bunny y devuelve un `videoId` +
   una URL de subida con TUS (resumable upload) al navegador.
2. El navegador sube el archivo directo a Bunny (no pasa por nuestro servidor ni por Supabase),
   con barra de progreso. Esto evita el límite de 50 MB de Supabase.
3. Al terminar, el formulario guarda la fila en `category_modules` con el `bunny_video_id`.
4. Para reproducir: el servidor pide a Bunny una URL de reproducción firmada con expiración corta
   (minutos) cada vez que un comprador abre un módulo — nunca se guarda un link público permanente
   en la base de datos. Requiere activar "Token authentication" en la Video Library de Bunny
   (pendiente de configurar al implementar; la clave de firma vive solo en el servidor).
5. El reproductor embebido de Bunny ya deshabilita la descarga directa por defecto; se configura
   sin botón de descarga visible.

## UI

### Panel de administradora (`/panel`)

- Si `auth.uid()` es `owner_id` de alguna fila en `course_categories`, aparece el botón
  **"METODOLOGÍA PODEROSA — Cargar material del curso"**.
- Lleva a `/panel/metodologia-poderosa`: lista de módulos de SU categoría (título, orden,
  publicado/borrador), con botones Editar/Eliminar, y botón "Cargar material" que abre el wizard:
  1. Título
  2. Descripción
  3. Subir video (barra de progreso, sube a Bunny)
  4. "¿Tiene material de apoyo?" Sí/No → si Sí, subir archivo(s)
  5. Orden (número o flechas subir/bajar)
  6. Miniatura: automática por defecto, con opción de subir una propia
  7. Publicar / Guardar como borrador
- Edición de módulo existente reutiliza el mismo formulario precargado.
- Un campo editable para el título de su categoría, fuera del wizard de módulos.

### Visor del curso (comprador)

- Página nueva, ej. `/cursos/metodologia-poderosa` (slug exacto a definir en el plan).
- Sin acceso (no comprado): portada/resumen + botón de compra, sin contenido.
- Con acceso: menú lateral (o superior en móvil) con las 3 categorías expandibles, módulos en
  orden, marca de visto simple; reproductor grande + descripción + material de apoyo descargable
  al seleccionar un módulo. Módulos en borrador no aparecen.
- Estilo visual: inspirado en Udemy/Platzi en estructura, con los componentes y paleta
  (dorado/crema/serif) que ya usa el resto de poderosas.org — no se introduce un sistema de
  diseño nuevo.

## Fuera de alcance (explícitamente, para esta spec)

- Agregar/quitar categorías desde la UI (las 3 son fijas por ahora, vía semilla SQL).
- Editar precio/título/publicar el producto completo desde una UI — lo hace Oscar manualmente.
- Progreso de video guardado al segundo exacto, certificados, comentarios o cualquier feature de
  LMS más allá de ver módulos y marcarlos vistos.
- Protección contra grabación de pantalla (no existe, se documentó por qué en el brainstorming).

## Migración / semilla (SQL, se entrega inline para pegar en Supabase)

Se entrega como parte del plan de implementación (no en esta spec), siguiendo la regla del
proyecto: las migraciones van en el chat para que el usuario las pegue en el SQL Editor de
Supabase, Claude no las ejecuta directamente.
