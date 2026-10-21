# Bitácora — Poderosas.org

Registro de decisiones, lo hecho y lo pendiente. Actualizar antes de cada `/clear`.

## 2026-10-21 (continuación 7) — Auditoría de seguridad real

A pedido explícito del usuario ("¿alguien podría hackear o acceder sin
pagar?"). Revisión línea por línea de todas las políticas RLS.

**Hallazgo crítico, confirmado y cerrado:** la política de insert de
`orders` solo validaba "esta orden es mía", no qué valores trae —
cualquier usuario con cuenta podía, usando la API pública de Supabase
directo (sin pasar por el sitio), insertar una orden con
`status: 'approved'` apuntando a cualquier curso, sin pagar, y
`has_access_to_product()` le daba acceso real. Corregido: desde el
cliente solo se puede crear una orden en `pending`; pasar a `approved`
es exclusivo del servidor (webhook de Wompi, que valida la firma antes).

**Hallazgo menor, cerrado de paso:** cualquier usuario podía
auto-asignarse `role = 'creator'` en su perfil (impacto real bajo: no
desbloquea nada sin una fila en `creators`, que solo se crea a mano).
Trigger nuevo bloquea el auto-cambio sin afectar las promociones
hechas por el admin (service role).

**Verificado con ataques reales simulados** (cuenta de prueba, sin
tocar datos de las creadoras): orden falsa "approved" → bloqueada.
Auto-escalación de rol → bloqueada. Flujo normal de compra (pending) →
sigue funcionando igual que siempre.

## 2026-10-21 (continuación 6) — QA completo del sitio

A pedido del usuario: recorrido sistemático de todo el sitio (público,
login/registro, panel completo con cuentas de prueba sintéticas),
probando cada botón/acción.

**Hallazgo urgente:** contenido real de prueba quedó visible
públicamente en `/kat` y `/shei` (incluido uno vulgar/inapropiado,
"GUIA DE CRECIMIENTO ANAL") — efecto directo del cambio de hoy
("visible de inmediato al subir"). Ocultado de inmediato (no borrado)
en cuanto se encontró.

**Arreglos de esta ronda:**
- Productos `physical` no aparecían en ningún lado del perfil público
  ni eran comprables (la sección solo filtraba course/digital) — ahora
  incluye physical, renombrada "Cursos y productos".
- Mensajes de error de Supabase Auth en inglés ("Invalid login
  credentials") en un sitio en español — `src/lib/authErrors.ts`
  traduce los casos comunes.
- Panel de cuenta cliente sin link a "Mis compras" (solo decía que
  "aparecerían aquí").
- 2 errores de lint preexistentes (`<a>` en vez de `<Link>`) corregidos
  de paso en login/registro.
- `package-lock.json` tenía el override de `jsdom` a medio resolver
  (npm decía "overridden" pero nunca lo instalaba) — causaba error en
  el servidor de desarrollo local. Regenerado desde cero.

**A pedido del usuario:** se borraron los 7 productos de prueba de Kat
y Shei (incluidas sus órdenes de prueba asociadas, que bloqueaban el
borrado por la restricción `on delete restrict`). Se excluyó
explícitamente el evento del 21 de noviembre por no ser una prueba.
Solo se tocaron datos — nada de código/UI cambió en este borrado.

Verificado todo contra producción real tras cada cambio.

## 2026-10-21 (continuación 5)
El home mostraba el HTML crudo de la bio (`<p><strong>...`) en vez del
texto — efecto colateral de haber migrado bio a texto enriquecido sin
actualizar la tarjeta del home, que esperaba texto plano. Se agregó
`stripHtml()` (quita etiquetas + recorta a un largo razonable) en
`lib/panel/sanitize.ts`, usada en el home y en "Otras Poderosas" (que
tenía su propia regex improvisada para lo mismo). Verificado contra
producción real.

## 2026-10-21 (continuación 4) — pulido visual de cursos y navegación

Investigado: patrones de tarjeta de curso 2026 (ratio de imagen estable
16:10, radios ~12px, jerarquía título/precio en grid real). La tarjeta
de "Cursos y contenido" no estaba rota — solo le faltaba un tamaño
acorde (antes ocupaba todo el ancho del contenedor; ahora es una grilla
de 1/2/3 columnas según pantalla, con insignia de precio en el color
de acento y hover con sombra/zoom).

Nuevo: `OtherCreatorsSection` — cada perfil público enlaza a las otras
dos Poderosas + "volver al inicio" (antes no había forma de navegar
entre perfiles sin pasar por el home). Mini-navegación pegajosa dentro
del perfil (Sobre mí / Cursos / Otras Poderosas) para ubicarse entre
secciones largas.

Verificado contra producción real.

## 2026-10-21 (continuación 3)

### Por qué /shei no mostraba cursos
Investigado a pedido del usuario: los 5 productos de Shei en producción
estaban como borrador (`is_published = false`), excepto la boleta del
evento y un producto físico — por eso la sección de cursos aparecía
vacía. Se confirmó que todo lo subido hasta ahora bajo su cuenta son
pruebas, ninguno es contenido real. De paso se encontró y borró un
residuo mío (`[PRUEBA] Ebook de prueba`) que había quedado en su cuenta
real desde una prueba de una sesión anterior — el cleanup de ese
momento falló silenciosamente y no se notó hasta ahora.

### Simplificado: subir = visible de inmediato (una de las tres no es técnica)
El flujo de "sube → queda en borrador → hay que acordarse de publicar"
era fricción innecesaria para quien no está familiarizada con tecnología.
Cambios:
- `UploadWizard` crea el producto ya visible (`is_published: true`).
- "Mi contenido": lenguaje más claro — Mostrar/Ocultar en vez de
  Publicar/Despublicar, "Visible en tu página"/"Oculto" en vez de
  Publicado/Borrador.
- Nuevo botón "Corregir": edita nombre, descripción y precio sin
  borrar y volver a subir.

### Vista de teléfono restaurada
Se había perdido al abandonar Puck. La vista previa en vivo del panel
ahora tiene su propio selector móvil/escritorio (marco de 390px para
simular el teléfono).

## 2026-10-21 (continuación 2)

### Bug real en producción: 500 en /[slug] (encontrado por Shei probando)
Al guardar su bio con texto enriquecido, `poderosas.org/shei` empezó a
dar error 500 real (no 404). Causa: `isomorphic-dompurify` v3+ con
`jsdom@28+` rompe `require()` en entornos CommonJS como Next.js en
Vercel (ERR_REQUIRE_ESM) — problema conocido y documentado por el
propio proyecto. No se reproducía en local (mismo SO), solo en el
entorno serverless real de Vercel. Arreglado fijando `jsdom` a `25.0.1`
vía `overrides` en `package.json` (workaround oficial). Verificado
contra producción real tras el fix: `/shei` vuelve a cargar.

**Lección:** cuando algo falla solo en producción y no en local, no
asumir que "ya probé, está bien" — hay que verificar contra el
entorno real (Vercel), no solo local.

### Últimos ajustes al panel (Shei): alineación, video, posición de bloques
- Texto (bio y bloques): botones alinear izquierda/centro/derecha
  (`@tiptap/extension-text-align`), por párrafo.
- Video: ahora se sube desde la galería (bucket `covers`), además de
  seguir aceptando un link.
- Imagen/video: selector de "posición" (izquierda/centro/derecha) —
  centrado es ancho completo, a un lado es más angosto para que se
  note la posición.

Probado contra producción real (no solo local, por la lección de
arriba) con una creadora de prueba sintética: bio centrada, texto a
la derecha, imagen a la izquierda, video a la derecha — todo cargó
bien en `poderosas.org`, sin el error 500. Shei confirmó "todo ok"
antes de pedir estos tres ajustes finales — con esto, el panel de
personalización queda cerrado por ahora.

## 2026-10-21 (continuación)

Los 3 PRs de la sesión anterior se mergearon a `main` con autorización del
usuario ("mergea de una"). Conflicto real en `src/app/api/webhooks/wompi/route.ts`
(boleta de evento vs. activación de membresía) resuelto combinando ambas
lógicas. Se encontró y corrigió un error de build en producción que `tsc
--noEmit` no detectaba (import de CSS de Puck con el path interno en vez
del export oficial del paquete) — build local reproducido y arreglado
antes de confirmar. Redeploy a `poderosas.org` verificado: `/evento` y
`/panel/personalizar` responden bien.

Ramas `feature/boleta-evento`, `feature/entrega-contenido` y
`feature/editor-puck` quedan mergeadas; `main` es ahora la base única.

### Se abandonó Puck — editor de panel reemplazado por formulario fijo
Shei probó el arrastrar-y-soltar dos veces más en producción, con mouse
real, y siguió fallando aunque se corrigieron las dos causas documentadas
(anidamiento flex alrededor del canvas, luego el `<body>` raíz siendo
flex). En vez de seguir persiguiendo un bug de una librería externa poco
confiable en este entorno, se rediseñó `/panel/personalizar` sin ningún
drag-and-drop: botones (+agregar, ↑↓ reordenar, ✕ quitar) para una lista
de bloques opcionales de texto/imagen/video, foto de perfil/portada con
botón real de subida + punto focal (clic para elegir qué parte se ve,
corrigiendo de paso un bug real: un `<label>` envolvía todo el campo e
interceptaba cualquier clic para reabrir el selector de archivo), bio con
negrita/cursiva/tamaño, y una **sección de cursos fija y automática**
en el perfil público (se arma sola desde los productos publicados, no se
edita a mano — resuelve de raíz el caso de uso más importante que
dependía del drag). Se eliminó `@puckeditor/core` y todo el código
muerto asociado, además del editor casero original (`PanelEditor.tsx`,
`CreatorProfile.tsx`, `panelLayout.ts`) que ya no se usaba.

Probado de punta a punta con una creadora de prueba sintética: agregar
un bloque, guardarlo y verlo en la página pública real, todo con
botones, sin arrastrar nada.

**Pendiente:** confirmar con Shei (o cualquiera de las tres) en
`poderosas.org/panel/personalizar` que el nuevo panel funciona bien a
su gusto.

### Vista previa en vivo + texto enriquecido de verdad
Dos pedidos más de Shei tras probar el panel fijo:
- "Ya no se ve una muestra en tiempo real": se agregó vista previa en
  vivo (dos columnas: formulario + perfil renderizándose en tiempo
  real), reutilizando un componente (`ProfilePreview`) compartido con
  la página pública real.
- "La negrita/tamaño se aplica a todo, quiero que aplique solo a lo
  seleccionado": se reemplazó el estilo global de un solo campo por
  texto enriquecido real con Tiptap (`@tiptap/react` + `starter-kit`),
  con una extensión propia de tamaño de fuente (el paquete oficial
  `@tiptap/extension-font-size` solo existe en pre-release, no se usó
  por eso). Bug real encontrado y corregido: los botones de la barra
  le quitaban el foco al editor antes del clic, perdiendo la
  selección — se arregla con `onMouseDown` + `preventDefault` en cada
  botón (workaround documentado de Tiptap).

**Verificación:** el navegador de pruebas tuvo artefactos visuales
raros (desfase de coordenadas tras scroll, un glitch mostrando una
imagen de portada ajena que NO estaba en la base de datos — se
verificó aparte y no hubo ninguna fuga real de datos entre cuentas).
Para no quedar a ciegas por eso, la verificación final se hizo leyendo
el HTML guardado directo en Supabase en vez de confiar en capturas de
pantalla: `<p>Hola soy <strong>Shei</strong></p>` — confirma que el
formato aplicó solo a la palabra seleccionada, no a todo el texto.

## 2026-10-19

### Decidido
- Reglas de trabajo formalizadas en [CLAUDE.md](CLAUDE.md).
- Prioridad actual: NO seguir con el panel de creadoras/membresías. La prioridad es construir la compra de cupo para el show en vivo de Kat, Shei y Luz (30-50 personas), con la rebanada más delgada posible, publicada de verdad en poderosas.org.
- Flujo deseado por el usuario: entrar a la web → pagar sin crear cuenta → pasarela (Wompi) → boleta (con QR) al correo.

### Hallazgo clave (bloquea el diseño actual)
El código ya construido asume **comprador con cuenta**:
- `orders.buyer_id` → `not null references profiles(id)`.
- `event_registrations.buyer_id` → `not null references profiles(id)`, con política RLS `auth.uid() = buyer_id`.
- `/api/checkout` (`src/app/api/checkout/route.ts`) exige `supabase.auth.getUser()` antes de crear la orden.

Esto choca con "pagar sin login". Para 30-50 personas comprando una sola boleta, exigir registro es friction alto y no es necesario. Hace falta decidir el modelo de "comprador invitado" antes de tocar código — ver pregunta pendiente abajo.

### Investigado
- No se encontró documentación pública de Wompi sobre checkout sin sesión vs. con sesión (el checkout hospedado de Wompi en sí no exige login del comprador en Wompi; el login que exige hoy es el nuestro, de Supabase, antes de llegar a Wompi).
- Para 30-50 asistentes, la práctica estándar (Eventbrite, Emma, etc.) es: QR único por boleta, enviado por correo, escaneado en la entrada con una app/página de escaneo que marca el check-in y evita duplicados; tener plan B de lista impresa.
- Resend (gratis hasta 100 correos/día, 3000/mes) permite adjuntar imágenes desde una Route Handler de Next.js — alcanza de sobra para 50 boletas.

### Decidido (actualización)
- Compra de boleta = invitado sin cuenta (nombre + correo). Membresías/contenido siguen exigiendo login, no se tocan.
- Correo de las boletas: Resend (gratis).
- Fecha tentativa del evento: 21 de noviembre, Bogotá, 10am (por confirmar). Falta precio y cupo máximo.
- Base de datos de pruebas separada de producción: **pospuesto a propósito**. El usuario decidió seguir sobre el único proyecto de Supabase ("PODEROSASORG", producción) mientras no haya visitas reales al sitio. Retomar esto antes de que el evento esté en vivo o haya tráfico real — no antes de lanzar, pero sí antes de que haya dinero/datos reales de terceros en juego.
- Se creó la rama `feature/boleta-evento` para este trabajo.

### Hecho (rama `feature/boleta-evento`, commits locales, sin push todavía)
- Migración SQL aplicada en Supabase (producción, por decisión del usuario — ver abajo): `orders` acepta invitados, tabla `event_tickets`, `products.capacity`, policy `orders_select_guest`.
- Producto placeholder del evento creado bajo la cuenta de **Shei** (ya tiene Wompi configurado): precio $1.500 COP (placeholder, ajustar), cupo 50, `is_published = false`.
- `/evento`: formulario de nombre + correo, sin login.
- `/api/checkout-evento`: crea la orden de invitado y redirige a Wompi.
- Webhook de Wompi: al aprobarse una orden de tipo evento, crea la fila en `event_tickets` y envía el correo (Resend) con el QR adjunto.
- `/escaner`: página protegida (requiere sesión de creadora) con cámara (BarcodeDetector) + campo manual de respaldo; `/api/escaner/check-in` valida y marca el check-in, evitando duplicados.
- **Probado de punta a punta en local**: compra con tarjeta sandbox de Wompi (4242...4242, aprobada) → orden quedó `approved` con `buyer_name`/`buyer_email` → se creó la boleta en `event_tickets` → llegó el correo real a oscarmetacho@gmail.com con el QR y el código correcto. (El webhook se simuló a mano porque localhost no es alcanzable desde los servidores de Wompi — normal, se resuelve solo al desplegar a un dominio real.)
- Paquetes nuevos: `resend`, `qrcode`.
- `RESEND_API_KEY` ya está en `.env.local` del usuario.

### Hecho (actualización)
- ~~Probar `/escaner` con sesión real de una de las creadoras~~ — probado por el usuario: valida boletas nuevas, rechaza repetidas.
- ~~Probar el escaneo con cámara real desde el celular~~ — probado en iPhone sobre `https://poderosas.vercel.app`. Se encontraron y corrigieron 2 bugs reales en el camino: (1) `BarcodeDetector` nativo no existe en Safari/iOS ni Firefox, se reemplazó por `jsQR` (JS puro, funciona en cualquier navegador); (2) el `<video>` nunca quedaba conectado al stream de la cámara porque se asignaba antes de que React lo montara en el DOM — se movió la conexión a un `useEffect`. Confirmado: lee el QR al instante y bloquea boletas repetidas.
- Regla de ramas ajustada (2026-10-20, a pedido del usuario): ahora Claude hace el push; el merge lo sigue autorizando el usuario.
- Push de la rama y PR abiertos por Claude: https://github.com/PoderosasORG/PODEROSASPROYECT/pull/1
- Proyecto de Vercel creado en team nuevo **`poderosasorg`** (no en el team personal del usuario, por la regla de "cuentas a nombre del dueño real del proyecto").
- Deploy en producción (Vercel, sin dominio propio todavía): https://poderosas.vercel.app — con el placeholder del evento, no publicado para venta real.
- Variables de entorno copiadas a Vercel (production/preview/development) directo desde `.env.local`, sin que Claude viera los valores.

### Hecho (actualización 2026-10-20/21 — evento 100% listo para vender)
- Home: sección "Primer evento en vivo" con fecha/hora/lugar reales y botón a `/evento`.
- Precio y cupo reales del evento: **$100.000 COP, cupo 50**, `is_published = true`. Fecha: 21 de noviembre, 8:30am–1:00pm, Edificio Emprendu (Calle 85 #12-66, Bogotá).
- Correo de la boleta rediseñado: agradecimiento, info completa del evento, QR embebido inline (no solo adjunto).
- Escáner: muestra "¡Bienvenida, {nombre}!" al validar, para que quien reciba en la entrada salude por nombre.
- **Dominio real conectado:** `poderosas.org` → nameservers de Vercel (`ns1`/`ns2.vercel-dns.com`), DNS propagado y verificado, SSL activo.
- **Llaves de Wompi actualizadas a producción** (antes teníamos las de sandbox por error) para la cuenta de Shei — verificado sin completar un pago real (checkout cargó en modo producción, sin la bandera "MODO DE PRUEBAS").
- Webhook de Wompi registrado en el panel de Shei apuntando a `https://poderosas.org/api/webhooks/wompi`.
- 3 PRs abiertos por Claude y **mergeados a `main` con autorización del usuario** (2026-10-21):
  - [#1](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/1) boleta del evento,
  - [#2](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/2) entrega de contenido comprado,
  - [#3](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/3) editor Puck + niveles de acceso + suscripción.
- El merge de #3 tuvo conflicto real en el webhook (boleta de evento vs. activación de membresía, ambas tocan el mismo handler) — resuelto a mano combinando ambas lógicas como dos `if` independientes, sin perder ninguna.

### Hecho — Plataforma de cursos (rama `feature/entrega-contenido` → mergeada)
Hueco real resuelto: antes, quien compraba un curso o un ebook no tenía forma de verlo después.
- Función `has_access_to_product()` + políticas RLS en `course_lessons`/`product_files`.
- `/api/mis-compras/signed-url`: genera links temporales (10 min) de Storage.
- `/mis-compras`: lista lo comprado, con ver/descargar.
- Probado con datos sintéticos (producto + archivo + comprador de prueba, todo eliminado después): RLS confirma acceso a quien compró, lo niega a quien no.

### Hecho — Niveles de acceso y suscripción de plataforma (rama `feature/editor-puck` → mergeada)
- `products.access_tier`: **public** (cualquiera) / **registered** (gratis con cuenta) / **subscription** (incluido para quien tenga suscripción activa, de CUALQUIER creadora) / **paid** (compra individual, por defecto).
- La suscripción es un **pago único por período** (mes o año) — **decisión del usuario**: Wompi no ofrece cobro recurrente automático y no se va a cambiar de pasarela por eso. (Se investigó: Bold sí anuncia "automatizar cobros recurrentes" en su API, en BETA — [docs.bold.co](https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea) — queda anotado como opción a futuro, no urgente.)
- Webhook: al aprobarse el pago de un producto `type=membership`, activa/renueva la fila en `memberships` (upsert por `buyer_id`+`product_id`, requiere constraint único nuevo).
- `UploadWizard`: el viejo "¿gratis para miembros?" (sí/no) se reemplazó por el selector de las 4 opciones de acceso.
- Probado con datos sintéticos: comprador con suscripción activa ve contenido `subscription` de una creadora que no le vendió nada directamente; comprador sin suscripción, no.

### Hecho — Editor de personalización migrado a Puck (rama `feature/editor-puck` → mergeada)
El editor casero (lienzo libre, posiciones x/y independientes móvil/escritorio) resultó impreciso — el usuario lo notó de una sesión anterior.
- Se investigó: [Puck](https://github.com/measuredco/puck) (paquete `@puckeditor/core`), editor visual open source (MIT) hecho para React/Next.js.
- **Cambio de modelo, decidido con el usuario:** Puck apila bloques en zonas (sin x/y libre) — el responsive queda automático, a cambio de perder el posicionamiento 100% libre que tenía el editor viejo.
- `src/lib/puck/config.tsx`: bloques (imagen, video, texto, producto) + root con avatar/portada/bio/tema.
- `/panel/personalizar` monta `<Puck>`; `/[slug]` usa `<Render>` si la creadora ya guardó con el editor nuevo, si no cae al sistema viejo (no rompe nada mientras migran).
- Nueva columna `creators.puck_data` (jsonb).

### Hecho — Correcciones al editor Puck tras feedback real de Shei (2026-10-21)
Shei probó el editor en producción y reportó: (1) no se podía arrastrar ningún bloque al lienzo, (2) las imágenes pedían URL en vez de subir un archivo, (3) los colores pedían código hex en vez de una paleta visual, (4) el cambio de vista móvil sí funcionaba bien.
- **Drag-and-drop:** diagnosticado con una creadora de prueba sintética (sesión vía magic link + `/auth/confirm`, sin tocar la cuenta real de Shei). Causa encontrada: el `<Puck>` estaba anidado dentro de varios `div` con flexbox alrededor — [issue conocido de Puck](https://github.com/puckeditor/puck/issues/1717). Se aplanó el layout (Puck como único hijo de un contenedor de altura fija, header como overlay encima).
- **Subida de imagen:** nuevo campo `imageUploadField` (sube al bucket `covers` de Supabase Storage).
- **Selector de color:** nuevo campo `colorField` (`<input type="color">`).
- Nota técnica real: los componentes de estos campos custom tuvieron que vivir en archivos `"use client"` aparte — el paquete de Puck resuelve un build distinto ("react-server") cuando se importa desde un Server Component (como `/[slug]` para `<Render>`), sin `FieldLabel` ni otras piezas del editor interactivo. Se encontró en dos vueltas (primero con `imageUploadField`, después con `colorField`, mismo problema).
- **Honestidad sobre la verificación:** el `left_click_drag` de mi herramienta de automatización (y hasta eventos de puntero disparados directo por JavaScript) no logró activar el motor de arrastre de Puck — es una limitación conocida de herramientas de automatización con librerías como `dnd-kit` (los eventos sintéticos no siempre se tratan igual que un mouse real). **No pude confirmar con 100% de certeza que el arreglo del layout resolvió el problema real que vio Shei** — apliqué la corrección documentada oficialmente para ese issue, pero falta que alguien con mouse real (Shei u otra) lo confirme en producción.
- `npm run build` falló una vez con un crash de proceso de Windows sin relación aparente con el código (reintentar lo resolvió) — anotado por si se repite.

### Pendiente
- **Confirmar con mouse real (Shei u otra)** que el drag-and-drop ya funciona en `https://poderosas.org/panel/personalizar` tras el fix de layout.
- Selector visual de productos dentro del bloque "Producto" de Puck (hoy se pega el ID a mano) + que muestre precio/portada reales.
- UI para que una creadora cree el producto de "suscripción Poderosas" en sí (hoy se crea a mano en Supabase, igual que el evento) — falta definir precio real.
- Autorizar la app de Vercel sobre el repo de GitHub para deploys automáticos con cada push (hoy se despliega a mano con `vercel deploy --prod`) — la app de Vercel no tiene permiso admin/write sobre `PoderosasORG` todavía.
- Base de datos de pruebas separada de producción: sigue pospuesta — se sigue trabajando directo en el único proyecto de Supabase porque no hay visitas reales todavía. Retomar antes del evento o de tener tráfico real.
- Revisar `npm audit` (9 vulnerabilidades, 1 crítica) cuando haya tiempo — no bloqueante por ahora.

### Pospuesto (confirmado por el usuario, no tocar ahora)
- Diseño visual / estética fina del sitio (más allá de lo ya hecho).
