# Spec — Plataforma de cursos y contenido (más allá del evento)

Rama separada de `feature/boleta-evento` (que sigue siendo prioridad y no se toca).
Base: `main` (sin el código del evento).

## Lo que ya existe (antes de esta spec, no hay que rehacerlo)
- `/panel/subir`: wizard que crea productos (digital, curso con capítulos, evento,
  membresía, físico), con portada, archivos, cupón, "gratis para miembros".
- `/panel/contenido`: lista de productos de la creadora.
- `/panel/personalizar`: editor visual completo (colores, tipografía, bloques
  libres de imagen/video/texto/producto, posiciones independientes móvil/escritorio).
  **La personalización de identidad visual que pediste ya está construida.**
- `products`, `course_lessons`, `product_files`, `memberships`: tablas listas.
- Checkout (`/api/checkout`) y webhook de Wompi: genéricos, ya funcionan para
  cualquier `product.type`, no solo evento.

## El hueco real (por qué nada de esto sirve todavía de punta a punta)
Quien compra un producto digital o un curso **no tiene cómo verlo después**:
- RLS de `course_lessons` y `product_files` solo deja leer a la creadora dueña.
- El bucket de Storage `product-files` es privado y solo el `auth.uid()` que
  subió el archivo puede leerlo — ni siquiera con RLS en la tabla alcanzaría,
  hace falta generar URLs firmadas desde el servidor.
- No existe ninguna página "lo que compré".

Sin esto, aunque alguien pague, no puede acceder a nada. Este es el primer
problema a resolver — es la rebanada más delgada que hace que "comprar un
curso" funcione de verdad.

## Fase A (ahora) — Entrega de contenido comprado
1. RLS: permitir que el comprador (orden `approved`) o quien tenga membresía
   activa que cubra el producto (`is_free_for_members`) pueda leer
   `course_lessons` y `product_files` de ESE producto.
2. Endpoint que genera URLs firmadas (temporales) del bucket `product-files`,
   solo para archivos de productos que el usuario realmente compró — usa
   el service role en el servidor, nunca expone el bucket directo.
3. Página `/mis-compras` (requiere login): lista lo comprado; para un
   producto digital de archivo único, botón de descarga; para un curso,
   lista de capítulos con reproductor que carga el video vía URL firmada.
4. Las lecciones marcadas `is_free_preview` se pueden ver sin comprar
   (el campo ya existe, solo falta usarlo).

Con esto: alguien compra un curso → lo ve en `/mis-compras` → reproduce los
capítulos. Punta a punta, real, aunque la página de "Mis compras" se vea fea.

## Fase B — Cursos colectivos "Poderosas"
Problema de modelo de datos: `products.creator_id` hoy es una sola creadora.
Un curso hecho entre las tres no encaja ahí directo.

**Decisión por defecto que voy a tomar (dime si no te gusta):** igual que con
el evento, un curso colectivo se crea bajo la cuenta de **Shei** (ya tiene
Wompi configurado) — el dinero de "Poderosas" en general sigue cayendo ahí
hasta que decidan abrir una cuenta de Wompi a nombre de Poderosas.org como tal.
No se reparte automáticamente entre las tres (eso requeriría una integración
de pagos tipo marketplace que Wompi no ofrece — ver conversación anterior
sobre boletas).

## Fase C — Motivar el registro
Banners/CTAs en el home y en los perfiles públicos invitando a crear cuenta
("regístrate y accede gratis a X", favoritos, notificación de nuevo
contenido). Se diseña después de que Fase A esté probada.

## Fase D — Afinar personalización
Revisar el editor existente contra lo que cada una realmente necesita
(ya construido, solo ajustes si algo falta).

## Plan de tareas — Fase A (lo que ejecuto ahora)
1. Migración SQL (RLS nuevas + función de "¿este usuario compró este producto?").
2. `/api/mis-compras/signed-url`: genera la URL firmada de un archivo, validando la compra.
3. `/mis-compras`: página con lo comprado.
4. Reproductor simple de capítulos (lista + `<video>` o `<a download>`).
5. Prueba de punta a punta: comprar un producto digital de prueba → verlo en `/mis-compras`.
