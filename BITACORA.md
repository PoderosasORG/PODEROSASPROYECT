# Bitácora — Poderosas.org

Registro de decisiones, lo hecho y lo pendiente. Actualizar antes de cada `/clear`.

## 2026-10-21 (continuación 8)
- CRM agregado: `/panel/clientes` (ventas individuales de cada creadora,
  protegidas por RLS; + números colectivos de la plataforma sin
  desglosar cuánto vendió cada una). Probado con datos sintéticos.
- Verificado el asistente de subida para tipo "curso" de punta a punta
  (producto se crea bien como `type=course`). No se pudo probar la
  subida de un archivo de capítulo real con la herramienta de
  automatización (no simula el diálogo "elegir archivo" del sistema
  operativo) — el código y el patrón de Storage.upload ya están
  probados en otras partes del sitio.
- Revisado `mystery-tienda` (otro proyecto del usuario) en busca de
  patrones reutilizables. Se adoptó uno de inmediato:
  `paymentIntegrity.js` → segundo control en el webhook de Wompi que
  compara lo efectivamente cobrado contra lo que la orden esperaba,
  como defensa adicional a la firma de integridad. El resto
  (`financeReport.js`, `discount.js`/cupones reales, `rateLimit.js`,
  logística de envíos) quedó identificado pero no implementado — se
  reportó como propuesta, no se construyó todo en la misma sesión.

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

### Hecho — Auditoría de seguridad real + CRM + integridad de pago (2026-10-21)
El usuario preguntó directamente: "¿Hay seguridad? ¿Alguien 'experto' podría hackear o acceder a recursos sin pagar nada o pagar menos?" — se hizo una auditoría real del código (no una revisión superficial), con ataques simulados antes/después de cada corrección, nunca solo "debería estar bien".

**Vulnerabilidad crítica encontrada y cerrada:** la política RLS de `orders` permitía que cualquier usuario con cuenta insertara directamente, vía la API pública de Supabase (sin pasar por el checkout ni por Wompi), una fila con `status = 'approved'` — acceso gratis a cualquier producto. Confirmado con un ataque simulado real (insert directo con una cuenta de prueba sintética) antes de tocar nada; después de la corrección, el mismo ataque fue rechazado por la base de datos.
- `supabase/security_fix_orders.sql` (pegado por el usuario en el SQL Editor de Supabase):
  - `orders_insert_own_buyer`: solo permite insertar si `auth.uid() = buyer_id` y `status = 'pending'` (nunca `approved` desde el cliente).
  - Trigger `prevent_self_role_change` sobre `profiles`: si alguien intenta cambiar su propio `role` vía la API pública, el trigger lo revierte al valor anterior — cierra una escalación de privilegios menor (auto-asignarse `role = 'creator'`).
- **Lección:** las políticas RLS por defecto que solo revisan "¿es el dueño de la fila?" no bastan cuando el *contenido* de la fila (el `status`) es lo que otorga acceso — hay que restringir también qué valores puede escribir el cliente, no solo cuáles filas puede tocar.

**Defensa adicional en el webhook de Wompi** ([src/app/api/webhooks/wompi/route.ts](src/app/api/webhooks/wompi/route.ts)): se adoptó el patrón de `C:\Users\delga\mystery-tienda\app\lib\paymentIntegrity.js` (otro proyecto del usuario, revisado por petición explícita) — nunca confiar en un solo control. Ahora el webhook compara `transaction.amount_in_cents` (lo que Wompi dice que se cobró de verdad) contra `order.amount_cents` (lo que la orden dice que debía costar); si pagaron menos, la orden se marca `error` en vez de `approved`, aunque Wompi reporte éxito. La firma de integridad de Wompi ya protegía esto en el camino normal (si alguien manipula el monto antes de pagar, la firma no coincide y Wompi rechaza el pago); este chequeo es la segunda capa, por si algo se escapa. Pagar de más nunca se bloquea (puede pasar por redondeos/cuotas).

**Verificación del flujo de subida de cursos:** probado de punta a punta con una creadora de prueba sintética para `type='curso'` — creación de producto correcta, aparece en el panel y en el perfil público. Limitación honesta: la herramienta de automatización de navegador no puede abrir el diálogo nativo "elegir archivo" del sistema operativo, así que la subida real de un archivo de capítulo no quedó probada en esta sesión (el mecanismo de subida a Storage ya está probado y en uso en otras partes del sitio — avatar, portadas, imágenes de Puck).

**CRM nuevo** — `/panel/clientes` ([src/app/panel/clientes/page.tsx](src/app/panel/clientes/page.tsx)), enlazado desde `/panel`:
- **Individual**: tabla de ventas y clientes de la propia creadora (protegido por RLS — `creator_id = auth.uid()`), con nombre/correo tomado de `buyer_name`/`buyer_email` (compra de invitado) o de `profiles.full_name` vía el cliente admin (compra con cuenta), más tarjetas de ingresos totales / clientes únicos / número de ventas.
- **Colectivo** ("Poderosas en conjunto"): usa el cliente admin para contar clientes únicos de toda la plataforma y boletas de evento vendidas — **decisión de diseño explícita, no pedida pero necesaria**: nunca muestra cuánto vendió cada creadora a las otras, solo el agregado total del proyecto. Está anotado así en la propia UI.

**Revisión de `mystery-tienda`** (`C:\Users\delga\mystery-tienda`) por petición explícita, para ver qué "clonar":
- **Adoptado ya** (ver arriba): el patrón de verificar lo realmente cobrado contra lo esperado (`paymentIntegrity.js`).
- **Identificado, no construido todavía** (pendiente de priorizar con el usuario):
  - Cupones/códigos de descuento reales — `UploadWizard` ya pregunta por un cupón en el checkout pero nunca se verificó que la lógica de redención exista; en mystery-tienda viven en `discount.js`/`giftCodes.js`.
  - Límite de tasa (`rateLimit.js`) sobre endpoints públicos sin login — especialmente el checkout de evento y el check-in por QR, hoy sin ninguna protección contra abuso automatizado.
  - Reportes financieros más completos (`financeReport.js`) — podría extender el CRM nuevo.
  - Logística de envíos (`skydropx.js`/`postalCodes.js`) — solo relevante si de verdad se van a vender productos físicos con envío (hoy existen productos `physical` pero sin flujo de envío).

**UI/animaciones:** confirmado que el zoom al pasar el mouse sobre las tarjetas de curso (`group-hover:scale-105`) y los precios visibles en los productos ya existían de trabajo previo de pulido visual — no se tocó nada nuevo en esta sesión porque ya cumplía lo pedido.

### Pendiente (actualizado 2026-10-21)
- Wompi independiente para Kat y Luz (todos los pagos siguen ruteando por la cuenta de Shei).
- Base de datos de pruebas separada de producción — cada vez más urgente porque ya hay dinero real en juego, no solo pruebas.
- Cupones de descuento reales en el checkout (ver arriba).
- Límite de tasa en endpoints públicos sin login (checkout de evento, check-in QR).
- Reportes financieros más completos (extender el CRM).
- Logística de envío si se venden productos físicos de verdad.
- Autorizar la app de Vercel sobre el repo de GitHub para deploy automático.
- Verificar dominio de Resend (`boletas@poderosas.org`) — hoy el correo sale desde `onboarding@resend.dev`.
- Activar Zoho Mail cuando se quiera, agregando MX/TXT dentro del panel de DNS de Vercel (no Porkbun, porque los nameservers ya están delegados a Vercel).
- `npm audit` (9 vulnerabilidades, 1 crítica) — sigue sin revisar, no bloqueante.

## 2026-10-27 — Edición de video del curso de Sheina (módulo "¿Qué quieres?")

**Nota de ubicación:** este trabajo vive fuera del repo de `poderosas.org`, en `D:\METACHO CLAUDE\PREMIERE-CLAUDE\sheina-poderosas-modulo1\` (proyecto HyperFrames). El material fuente está en `C:\Users\delga\OneDrive\Desktop\SHEINA PODEROSAS [QUÉ QUIERO}\` (22 clips DJI 4K, fuentes, referencias visuales, guion y cartilla en PDF — la cartilla es un PDF escaneado sin texto extraíble). El video final se sube a poderosas.org como contenido de curso, no como código del sitio, pero se documenta aquí porque es trabajo activo del mismo proyecto/usuario.

Se armó y aprobó una plantilla de edición sobre el primer clip (`DJI_20261026190645_0776_D.MP4`, módulo 1 / video 1) tras varias iteraciones con Shei. **Reglas ya fijas para aplicar a los 22 clips:**

- **Identificación en pantalla:** "Sheina Rivera" + "Psicóloga · Creadora de contenido", abajo-izquierda, entrada/salida sutil (fade + barra vertical), tipografía Elegant Sans (Semibold para el nombre, mismo peso para el rol en mayúsculas).
- **Eliminar silencios — regla técnica crítica:** los timestamps de palabra de Whisper **no son confiables para el punto de corte** — su marca de fin de palabra puede incluir hasta ~500ms de cola silenciosa/reverberación. **Nunca cortar solo con esos timestamps.** Siempre verificar el corte con `ffmpeg -ss X -t Y -i clip.mp4 -af "asetpts=PTS-STARTPTS,silencedetect=noise=-35dB:d=0.05" -f null -` (umbral real de audio) alrededor de cada punto candidato, y cortar en el inicio/fin real de la voz con un margen de seguridad de ~15ms (para no comerse la palabra) + crossfade de audio de ~10ms (para evitar un "pop" digital). Nada de padding de 50-120ms "para que suene natural": eso es exactamente lo que Shei seguía escuchando como silencio.
- **Tomas fallidas:** si la persona se equivoca, hace una pausa y retoma, se elimina el intento fallido completo y se deja solo el último (el válido) — mismo criterio de corte preciso que arriba.
- **Motion graphics a pantalla completa:** cuando se menciona una metáfora/analogía o una palabra clave importante, se corta a una escena de pantalla completa (ilustración SVG animándose — ej. una brújula dibujándose con GSAP — con fondo degradado + "blobs" de color a la deriva), mientras el audio de la voz sigue sonando sin interrupción por debajo, y luego vuelve a cámara. Esto clona el mecanismo de edición ya usado en otras sesiones para Metacho Labs (Metacho Explora/Tips), pero con la paleta de marca de Poderosas, no la paleta oscura de esos proyectos.
- **Paleta de las ilustraciones:** beige + rosa + plateado + blanco + dorado como acento — armoniosa, sutil y elegante, nunca el color protagonista. **No ilustrar todo el tiempo** — solo quepa cuando hay una metáfora/analogía real que lo justifique, de vez en cuando, no en cada corte.
- **Subtítulo de contexto en las escenas de motion graphics:** mostrar el nombre del módulo actual (ej. "Módulo 1 · Reconocer lo que quiero") y, en vez de la palabra "Bloque" tal cual, el nombre propio de cada bloque (ej. "Prepararnos para escucharnos"), con la misma tipografía y tamaño ya usado (Elegant Sans, 28px, mayúsculas, letter-spacing).
- **Tipografías de marca** (de las 7 enviadas): "Elegant Sans" para identificación/subtítulos; "Elegant Bloom" (script) para la palabra clave destacada en las escenas de motion graphics; "Softers" quedó descartada para el uso final (se probó pero se reemplazó por Elegant Bloom); "Simply Olive" es una fuente DEMO con licencia restringida, no usar.
- Órden de iteración real de esta sesión (por si se repite un error parecido): v1-v3 ajustaron tipografía/tamaño/timing de la identificación y palabra clave → v4-v6 reemplazaron una línea decorativa simple por una ilustración SVG real (brújula) tras análisis de 6 referencias visuales de Shei, y luego por la escena de motion graphics a pantalla completa → v7-v10 fueron puramente sobre afinar el corte de silencios hasta llegar a la regla de arriba.

### Pendiente
- Aplicar esta plantilla completa a los 22 clips del módulo 1 — en curso, empieza ahora.
- Cada clip necesitará su propia metáfora/ilustración (no reutilizar siempre la brújula) y su propio nombre de módulo/bloque en el subtítulo.
- Definir con Shei si el video final de cada módulo se sube directo al curso en poderosas.org o si hay un paso de revisión previo.

### Hecho — Clip 1 completo editado + 2 correcciones críticas a la regla de silencios (2026-10-27)
Se editó el clip 1 (DJI_...0776, 170s) de punta a punta con la plantilla ya fijada: 12 fragmentos ("K1"-"K12"), 2 tomas repetidas eliminadas, identificación, subtítulo de módulo/bloque, 1 escena de motion graphics (brújula) para "¿Qué quieres?". Quedó en 38.4s. Al revisarlo, Shei reportó que **se comía la última vocal de dos palabras** ("profesionalmente" sin la "e" final, "sentirte" igual) y que **un corte arrancaba en mitad de un falso inicio** ("¿qué co-" antes de la toma válida "¿Y qué cosas..."). Dos lecciones nuevas para los 22 clips, **sobre la regla ya escrita arriba**:
- **El margen de salida de ~15ms no basta.** La vocal final de una palabra a veces tiene energía por debajo de -35dB (el umbral que se venía usando), así que `silencedetect` la reporta como silencio antes de que realmente termine el sonido. Hay que re-verificar con un umbral más sensible (`-45dB`) cualquier punto donde el margen de 15ms deje la palabra sonando "cortada", y extender el fin del corte (~0.1-0.15s en vez de 0.015s) hasta el verdadero fin de la vocal.
- **Un falso inicio puede ser tan corto (80-200ms) que Whisper nunca lo transcribe como palabra**, pero sigue siendo audible en el render. Antes de fijar el inicio de un corte, escanear la zona con `silencedetect` a sensibilidad alta (`-40dB`, `d=0.02-0.03`) buscando más de un pulso de voz separado por silencios cortos — el primer pulso corto suele ser el falso inicio a descartar, el pulso sostenido que sigue es la toma real.
- **Ilustraciones, en plural:** se agregó una segunda escena de motion graphics en el mismo clip (metáfora distinta — unas órbitas con un punto cada una, para "tantas ideas, tantas cosas que hacer") — confirmado que no hay que limitarse a una sola ilustración por clip si el contenido lo justifica, mientras se mantenga "de vez en cuando" y no se abrume al espectador.
- **Zoom Ken Burns sutil:** se agregó un zoom muy leve (escala 1.0 → 1.04/1.05, nunca al rostro) en 2-3 momentos por clip via GSAP directo sobre el elemento `<video>` (no hace falta wrapper intermedio — animar `transform` en el video no viola la regla de "no animar dimensiones de un elemento con tiempo", esa regla es sobre width/height, no sobre scale/transform).
- Archivos de referencia para clonar en los 22 clips: `compositions/scenes/escena-brujula-completa.html` y `compositions/scenes/escena-pendientes-completa.html` (fondo beige/dorado/plateado/rosa con "blobs" a la deriva + SVG dibujándose + palabra clave en Elegant Bloom).

### Hecho — Clip 2 completo + 3 correcciones más a la regla de silencios + cartilla real (2026-10-27)
Se editó el clip 2 (DJI_...0777, 319s → 81.2s) con 26 fragmentos, 1 repetición eliminada ("¿qué hay detrás de eso?" dicho dos veces, se dejó solo la primera), y 4 ilustraciones (antes 2) bien repartidas. Correcciones nuevas, **sobre las reglas ya escritas arriba**:
- **El umbral de `-35/-38dB` para `silencedetect` sigue sin ser suficiente.** Dos palabras se comieron su primera sílaba ("recuerden" sin la "re", "Al terminar" sin el "Al") porque esas consonantes suaves quedaban por debajo de ese umbral y el script de refinamiento automático creía que el silencio llegaba más tarde de lo real. **Umbral correcto para onset: `-45dB` con `d=0.02`.** Esto aplica tanto al inicio como al final de cada corte — re-verificar TODO con este umbral más sensible, no solo los puntos que suenan mal a simple oída.
- **Se automatizó la verificación** (antes se hacía corte por corte a mano): `scripts/refine_cuts2.py <audio.wav> '[[label, start, end], ...]'` corre `silencedetect` alrededor de cada punto aproximado (de Whisper) y devuelve el inicio/fin real con márgenes de seguridad (−15ms antes, +70ms después). Para un clip con muchos cortes (20-30), automatizar esto es indispensable — hacerlo a mano no escala a los 22 clips.
- **No ilustrar con inventos cuando existe el material real:** Shei ya diseñó y adjuntó su propia cartilla (`GUION Y CARTILLA/CARTILLA CON EJERCICIOS SHEI PODEROSA.pdf`, 17 páginas, paleta rosa/dorado/crema — coincide con la paleta que ya se había elegido por análisis de referencias, buena señal). Se rasterizó con PyMuPDF (`pip install pymupdf`; Windows no tiene poppler/`pdftoppm` instalado) a `media/cartilla_paginas/pagina_NN.png` y esas imágenes reales se usan en la ilustración (portada + hojeo rápido de 3 páginas), nunca un ícono de libreta inventado.
- **Para los próximos clips:** cuando Shei mencione un ejercicio específico de la cartilla por nombre (ej. "Detector de mis deseos", pág. 3; "Mi menú de antojos", pág. 5), mostrar el nombre del ejercicio en pantalla y una imagen de esa página puntual (unos segundos), no solo la portada genérica — pendiente mapear qué página de la cartilla corresponde a cada actividad mencionada en el guion, módulo por módulo.

### Hecho — Clip 2 v4: el bug real de "todavía hay silencios" (2026-10-27)
Tras la v3, Shei seguía escuchando silencios entre casi cada frase, además de 2 palabras comidas nuevas ("queremos" sin la "os", "Así que empecemos" sin "Así que") y una pausa real de 0.6s a la mitad de "Porque recuerden... que las personas cambiamos" (se partió en dos fragmentos). **La causa raíz del "todavía hay silencios" era el propio script de refinamiento**: `refine_cuts2.py` sumaba +70ms "de seguridad" después del límite de silencio detectado — eso no evita que se coma una palabra (para eso ya basta con el umbral sensible de -45dB), **eso directamente vuelve a meter el silencio que se estaba tratando de quitar**. Corregido a ~15ms (ver `scripts/refine_cuts3.py`), igual que el modelo del clip 1 ya aprobado.
- **Regla definitiva para los 22 clips:** margen de salida ≈15ms, nunca más. Si después de eso una palabra suena cortada, el problema NO es el margen — es que el umbral de detección (`-45dB`) no fue suficientemente sensible para esa consonante en particular; hay que re-verificar ese punto puntual con `d=0.1` (ignora cortes internos <100ms de la propia palabra) antes de tocar el margen.
- **Lección operativa:** al armar la lista de segmentos a pasar al script de refinamiento, verificar que el conteo de fragmentos antes/después cuadre — en esta ronda se perdió por error un fragmento completo ("Al terminar cada tema...") al copiar la lista, y no se notó hasta que Shei lo señaló indirectamente (pidió una ilustración en una zona que en realidad le faltaba contenido de audio).
- Se agregó una 5ª ilustración (`escena-chispa-completa.html`, bombilla) porque el primer tercio del clip (0-33s) no tenía ninguna — confirma que la distribución de ilustraciones debe revisarse por tramos de tiempo, no solo por número total.

### Hecho — Clip 2 v5: la causa raíz real de "todavía hay silencios" (2026-10-27)
Después de la v4, Shei señaló 9 puntos exactos con "silencio eterno" o palabra cortada. **Causa raíz encontrada:** cuando una frase va seguida de una pausa LARGA en la fuente original (varios segundos), el timestamp de fin de palabra que da Whisper puede estar sobreestimado por hasta **0.9 segundos** — mucho más que el caso típico (~100-200ms) que ya se sabía. El script de verificación buscaba hacia atrás solo ~0.3-0.7s desde ese timestamp, así que nunca llegaba a encontrar el silencio real, y el fragmento se quedaba con casi un segundo de silencio "pegado" en su propia cola — invisible al revisar el corte entre fragmentos (que sí quedaba en 0ms), porque el silencio estaba *adentro* del fragmento, no *entre* fragmentos.
- **Método definitivo (`scripts/refine_cuts5.py`):** en vez de buscar "dónde empieza el silencio" cerca del timestamp aproximado, ubicar los **intervalos de HABLA real** (el complemento de los silencios fusionados) dentro de una ventana amplia — hasta **2.5 segundos hacia atrás** para el fin de un corte, ~1.2s hacia adelante para el inicio — y usar el borde del último/primer intervalo de habla que cae dentro del rango esperado. Esto encuentra el límite real sin importar cuánto se haya equivocado Whisper.
- **Cuidado con la ventana demasiado amplia:** al aplicar esto en bloque a los 26 cortes, una ventana de +0.6s hacia adelante en zonas con frases MUY seguidas (poca pausa entre una frase y la siguiente) alcanzó a "tragarse" el principio de la frase siguiente como si fuera el final de la actual (pasó con "Direcciones que nos importan..." → casi se come el inicio de "Porque recuerden..."). **Nunca aplicar el método en automático y confiar ciegamente — siempre revisar que el resultado no se haya comido el silencio real que separa dos frases distintas**, sobre todo en tramos donde las frases están pegadas.
- Confirmado una vez más: alguna automatización + revisión puntual manual en los casos raros donde chocan dos reglas (en este caso "cortar silencio" vs "no comerse el inicio de la frase siguiente") es más confiable que confiar 100% en un solo script corrido en bloque.

**Corrección adicional al mismo clip:** un falso inicio puede durar varias sílabas pegadas (en este caso "¿Y-qué-co-", 3 pulsos de voz separados por silencios cortos de <150ms) antes de la pausa real que lo separa de la toma válida. **Regla afinada:** al mapear la zona con `silencedetect` sensible, no asumir que el primer pulso sostenido después del primer silencio corto ya es la toma buena — identificar la pausa más larga de la zona (normalmente ≥0.3-0.5s, un respiro real) y usar **esa** como el límite; todo lo que esté antes, por más que tenga 2-3 pulsos de voz, es parte del falso inicio.

## 2026-10-27/28 — Rediseño visual editorial de landing y perfiles de creadora

El usuario pidió acercar el look del sitio al de dos referencias (isabella-cortes.mykajabi.com, valentinaortizf.co), cambio puramente visual (sin tocar pagos/checkout/auth/DB). Brainstorming clasificado como **bounded** (flujo ya existente, solo estética) — diseño aprobado en el chat, sin spec escrito.

**Hecho** (PR [#4](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/4), fusionado y desplegado a producción):
- Landing (`src/app/page.tsx`): hero a pantalla completa con las fotos reales de Kat, Shei y Luz (sin grupo — el usuario no tenía foto de las tres juntas, se usó una tira de 3 fotos individuales como sustituto), overlay oscuro, tipografía serif más grande.
- `ProfileCard.tsx`: de círculo pequeño con iniciales a foto grande arriba (aspecto 4:5) + texto abajo.
- `ProfilePreview.tsx` (perfil público `/[slug]`, compartido con la vista previa del editor Puck en el panel): cover más alto (h-64/26rem) y avatar más grande (32/40), sin romper la personalización de color/fuente que cada creadora puede ajustar desde su panel.
- Nuevo `src/lib/creatorPhotos.ts`: mapa `slug → foto real` usado como **respaldo únicamente** (landing, `ProfileCard`, `CreatorCoursesSection`'s "otras poderosas") cuando `avatar_url`/`cover_image_url` están vacíos en la base de datos — si la creadora ya subió su propia foto, esa manda, nunca se sobrescribe.
- Fotos elegidas y copiadas a `public/images/creators/` (kat.jpg, shei.png, luz.png) desde `images/` (carpeta fuera del repo en git, sin trackear).
- **Hallazgo de paso, no corregido (no era parte del encargo):** el `avatar_url` ya guardado de Shei en producción es un flyer de cumpleaños, no una foto suya — y su bio pública tiene texto de prueba pegado (`...personal.dsfsdfDSFSDFSDFsdFSdfSdfSdfSD...`). Pendiente que ella lo actualice desde su panel.
- **Lección de proceso — multi-cuenta de GitHub:** el push inicial falló 403 porque `gh`/git tenían activa la cuenta `ELMETACHO` (sin permiso de escritura en `PoderosasORG/PODEROSASPROYECT`); el usuario tiene otra cuenta (`oscarmetacho-art`) con acceso — se resolvió con `gh auth switch --user oscarmetacho-art` + `gh auth setup-git`. Si un push falla con 403 en este repo, revisar primero `gh auth status` por si hay más de una cuenta logueada.
- **Deploy:** el repo todavía no tiene conectado el deploy automático de Vercel con cada push a `main` (pendiente desde antes) — se publicó a mano con `npx vercel deploy --prod` tras el merge, con autorización explícita del usuario.

### Pendiente
- Elegir/ajustar mejor el recorte de cada foto de portada si alguna queda cortada en una zona poco favorecedora (hoy usan foco 50/50 por defecto).
- Actualizar el `avatar_url` y la bio de Shei en producción (flyer + texto de prueba, ver arriba) — corresponde a ella hacerlo desde su panel.
- Seguir con lo que ya estaba pendiente antes de esta sesión: Wompi independiente para Kat y Luz, base de datos de pruebas separada, cupones de descuento, límite de tasa, autorizar deploy automático de Vercel.

## 2026-10-28 — Ajustes al landing: foto real del hero, titular, orden de creadoras

Pedido directo del usuario tras ver el primer rediseño: cambiar la foto del hero (envió una foto panorámica real de las tres juntas, 2000x750, para reemplazar la tira de 3 fotos individuales), nuevo titular ("Mentoras de mujeres poderosas"), reordenar "Nuestras Poderosas" (Luz → Shei → Kat, antes Kat → Shei → Luz) y quitar "Fundadora de Poderosas" del perfil de Kat. PR [#5](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/5), fusionado y desplegado.

- **Hero:** se descartó el enfoque `object-cover` a pantalla completa (recortaba la foto panorámica a un solo rostro con zoom). Solución: contenedor con `aspect-[8/3]` (la proporción exacta de la foto enviada) en vez de forzar la altura de la sección — así nunca se recorta, a cualquier ancho de pantalla.
- **Mobile — decisión explícita del usuario:** se probó una versión vertical (`aspect-[3/4]`) del hero para mobile, pero esa proporción recorta la foto panorámica a solo una persona (Shei, el centro) perdiendo a Luz y Kat. El usuario, tras ver la comparación, eligió mantener la banda panorámica completa también en mobile (se ve angosta pero las tres aparecen) — el resto de la página ya era 100% vertical/una columna desde el rediseño anterior, eso era lo que realmente pedía.
- Bio de Kat en Supabase corregida por el usuario mismo vía SQL (`UPDATE creators SET bio = 'Metodología, claridad y acción.' WHERE slug = 'kat';`) que le pasé en el chat — ya no queda ningún rastro de "Fundadora de Poderosas" en el sitio.
- **Lección de proceso:** después del deploy, la primera carga en el navegador mostró contenido viejo (caché) — se confirmó el cambio real navegando con un parámetro distinto (`?v=2`) para forzar bypass de caché antes de reportar éxito.

### Pendiente
- Afinar foto de portada de cada perfil individual si el recorte no favorece (foco 50/50 por defecto, ver sesión anterior).
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación) — Sección de evento rediseñada: masterclass con oferta 50%

Pedido: reemplazar "Primer evento en vivo" por un bloque "Masterclass presencial" (copy y mockup exactos que pasó el usuario), con precio especial destacado. PR [#6](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/6), fusionado y desplegado.

- **Análisis de referencias (pedido aparte, sin implementar todavía):** se revisaron de nuevo isabella-cortes.mykajabi.com y valentinaortizf.co. Hallazgo más importante: **Poderosas no tiene footer ni links a redes sociales en ninguna página** — ausencia real, no solo comparación cosmética. Otras ideas discutidas: sección de podcast al final (el usuario quiere agregar el podcast que tiene con su hermana, un clic a Spotify/YouTube — pendiente de que pase nombre y links), testimonios, números de prueba social en "Sobre mí" de cada creadora. Ninguna de estas se implementó todavía, quedan para cuando el usuario decida.
- **Precio real del evento:** aclarado con el usuario (había una inconsistencia entre lo que dijo de palabra "100 mil → 60 mil" y su propio mockup "$120.000 → $60.000"). Se confirmó: regular $120.000, especial $60.000 (50% real). Usuario actualizó `products.price_cents` a 6.000.000 vía SQL en Supabase — confirmado en producción.
- **Descuento sin fecha límite, a propósito:** el usuario decidió NO fijar una fecha de corte todavía porque quiere medir cuántas boletas se venden primero al precio actual antes de decidir cuándo subirlo. Por eso el precio se dejó fijo (no hay lógica de descuento por tiempo/cantidad en código) y el mensaje de urgencia es genérico: "quedan pocos cupos", sin contador.
- El precio regular ($120.000 tachado) que se muestra es **solo copy de marketing** (ancla de precio) — nunca se cobró ese valor, es puramente visual.
- El fondo oscuro del nuevo bloque queda listo para poner una foto encima más adelante (comentario en el código con la instrucción); el usuario todavía no decidió qué foto usar ahí.
- Botón final renombrado de "Comprar cupo" a "Comprar mi entrada" en landing y `/evento`.

### Pendiente
- Sección de podcast al final de la landing — falta que el usuario pase nombre del podcast + links de Spotify/YouTube.
- Footer con redes sociales — identificado como ausencia real, no implementado todavía.
- Foto llamativa de fondo para el bloque de la masterclass — por decidir qué imagen.
- Decidir en algún momento una fecha de corte real para el precio especial, cuando el usuario quiera medir y decidir subirlo.
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 2) — Podcast, foto propia de Shei, reorden final

- **Podcast "Deje la Pendejada"** (PR [#8](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/8)): sección final de la landing con la foto real de Kat y Shei (Shei señalando hacia arriba — el texto se puso deliberadamente encima de la foto para seguir ese gesto), links reales a YouTube (`youtube.com/@katyshei/podcasts`) y Spotify. La foto completa es un link directo a YouTube, mismo patrón que isabella-cortes.mykajabi.com.
  - **Lección de proceso — adjuntos de imagen que no llegan:** en esta sesión, una foto pegada directo en el chat (sin usar el botón de adjuntar archivo) no generó un archivo accesible en la carpeta temporal de la sesión (`images/` bajo el id de sesión) — pasó dos veces con la misma foto del podcast, mientras otras fotos de la misma conversación sí llegaron bien. Se resolvió pidiéndole al usuario que subiera el archivo a una carpeta local normal (`images/` del proyecto, o cualquier carpeta de su PC) y buscándolo ahí con `find`. Si una imagen pegada en el chat no aparece en la carpeta temporal esperada, no asumir que es un error del usuario — pedir que la suba a una carpeta y buscarla por fecha de modificación reciente.
- **Foto de Shei actualizada dos veces:** primero se cambió solo la foto de *respaldo* (`CREATOR_FALLBACK_PHOTOS`, PR [#7](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/7)) — pero no se notaba en el sitio porque Shei ya tenía un `avatar_url` propio guardado (el flyer de cumpleaños de antes), que siempre manda sobre el respaldo. Al final Shei subió su propia foto real y bio actualizada directamente desde su panel — ya no hace falta la de respaldo para ella.
- **Orden final de "Nuestras Poderosas"** (PR [#9](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/9)): Luz → Kat → Shei (se probaron dos órdenes distintos en la misma sesión a pedido del usuario — Luz-Shei-Kat y luego Luz-Kat-Shei — cada vez un cambio de una sola línea en `CREATOR_ORDER`).

### Pendiente
- Bios reales y completas de cada perfil (Luz y Kat siguen con bio genérica corta; Shei ya actualizó la suya).
- Footer con redes sociales — sigue sin existir en el sitio.
- Revisar contenido de cada perfil (bloques de Puck) para que se sientan completos.
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 3) — Bios reales de las tres creadoras

El usuario dio los datos reales de Luz y Kat (uno a la vez, por pregunta directa); Shei ya tenía la suya actualizada desde su panel. Se armaron bios cortas (mismo formato "rol · especialidad") y se le pasó el SQL al usuario para pegarlo en Supabase — confirmado en producción.

- Luz: "Publicista · +40 años en análisis energético y autoconocimiento"
- Kat: "Comunicadora Social | Estratega Digital y Creadora de Contenido"
- Shei: "Psicóloga | Estratega Digital y Creadora de Contenido" (ya existente)

**Pendiente, si el usuario quiere ampliarlo:** el usuario dio texto más largo y detallado para Luz (trayectoria de 40 años, estudio de manos/rostro) y Kat (7 años de experiencia, formación en PNL y astrología) que no se usó completo — se guardó solo la versión corta tipo "rol". El texto completo quedaría mejor como contenido dentro del perfil individual de cada una (bloques de Puck, sección "Sobre mí"), no en el campo de bio corta que se ve en las tarjetas. Texto completo para cuando se retome:
  - Luz: "Publicista con más de 40 años de trayectoria en el estudio de la energía, las manos y las dimensiones del rostro. Comparte sus conocimientos sobre análisis energético y autoconocimiento a través de las redes sociales, donde ha construido una amplia comunidad digital."
  - Kat: "Con más de 7 años de experiencia en creación de contenido y marketing digital, cuenta con formación en Programación Neurolingüística (PNL) y astrología. Integra la comunicación estratégica, el conocimiento del comportamiento humano y una visión integral del desarrollo personal para crear contenido con propósito e impacto."

### Pendiente
- Agregar el texto completo de arriba al contenido de cada perfil (Puck), si el usuario lo quiere.
- Footer con redes sociales — sigue sin existir en el sitio.
- Revisar contenido de cada perfil (bloques de Puck) para que se sientan completos.
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 4) — Bio extendida de Shei

Mismo patrón que Luz y Kat: el usuario dio el texto completo de Shei, se guardó una versión corta consistente para la bio de tarjeta/perfil y se dejó el texto completo acá para cuando se arme el contenido extendido de su perfil (Puck).

- Bio corta aplicada: "Psicóloga | Creadora de Contenido Digital · +7 años en comunicación estratégica"
- Texto completo para el perfil extendido de Shei:
  "Psicóloga de profesión y creadora de contenido digital con más de 7 años de experiencia en redes sociales, marketing digital y comunicación estratégica. Su trayectoria combina creatividad, storytelling y conocimiento de las audiencias para desarrollar contenido que conecta, genera identificación y aporta valor.

  Cuenta con formación y un profundo interés en áreas como las relaciones de pareja, el autoconocimiento y la salud mental. Integra su perspectiva psicológica con su experiencia en comunicación digital para crear mensajes que conectan con las personas, promueven la reflexión y generan impacto, combinando estrategia, creatividad y comprensión del comportamiento humano."

### Pendiente
- Agregar el texto completo de Luz, Kat y Shei (ver entradas anteriores) al contenido de cada perfil (Puck), cuando el usuario lo pida.
- Footer con redes sociales — sigue sin existir en el sitio.
- Revisar contenido de cada perfil (bloques de Puck) para que se sientan completos.
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 5) — Perfil de Luz completo: portada, foto de perfil y "Sobre mí"

Primer perfil terminado del plan "uno a la vez" (Luz → Kat → Shei) para dejar cada perfil individual listo con foto de portada bien centrada, foto de perfil, bio extendida en "Sobre mí", y listo para que suban cursos/ebooks/plantillas (esa función de subida ya existía de antes, vía `UploadWizard` en el panel — no hubo que construir nada nuevo ahí).

- Foto de portada nueva de Luz (traje rojo, primer plano) subida como asset estático (`public/images/creators/luz-cover.webp`) y referenciada en `creators.cover_image_url` vía SQL, con `cover_focus_y = 15` para que la cara quede centrada sin cortarse (el cover es una caja ancha y baja, y la foto es un retrato vertical — el foco por defecto 50/50 la habría cortado por la mitad de la cara).
- Foto de perfil (avatar) de Luz: sin cambios, a pedido explícito del usuario.
- Texto completo de "Sobre mí" de Luz (el mismo guardado en la entrada anterior, con una versión ligeramente ampliada que mandó el usuario) puesto en `creators.content_blocks` vía SQL — **esto reemplaza cualquier contenido Puck anterior del perfil**, se confirmó que estaba vacío antes de aplicarlo.
- **Lección de proceso reafirmada:** esta vez la foto SÍ llegó con ruta de archivo temporal al adjuntarla (a diferencia del intento fallido con la foto del podcast) — parece que el problema anterior fue puntual, no un patrón; seguir usando la carpeta temporal primero y solo pedir subida manual si falla de nuevo.

### Pendiente — mismo tratamiento para Kat y luego Shei
- Kat: foto de portada nueva (pendiente que el usuario la envíe) + texto largo ya guardado en sesión anterior ("Con más de 7 años de experiencia... PNL y astrología...").
- Shei: mismo tratamiento, texto largo ya guardado en sesión anterior.
- Footer con redes sociales — sigue sin existir en el sitio.
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 6) — Perfiles de Kat y Shei completos + bug de foco arreglado

Se completó el plan de dejar cada perfil individual listo (Luz → Kat → Shei), con un par de correcciones en el camino.

**Bug real encontrado y arreglado** ([src/app/[slug]/page.tsx](src/app/[slug]/page.tsx)): cuando una creadora no tiene `avatar_url`/`cover_image_url` propio y el sitio usa la foto de respaldo (`CREATOR_FALLBACK_PHOTOS`), el código ignoraba por completo `avatar_focus_x/y` y `cover_focus_x/y` guardados en la base de datos, forzando siempre 50/50 — por eso el ajuste de foco pedido para el avatar de Luz no se reflejaba aunque el `UPDATE` en Supabase sí se aplicara. Se corrigió para que el foco siempre se lea de la base de datos, tenga o no foto propia.

**Kat:** fotos de avatar/portada intercambiadas dos veces a pedido del usuario (primero subidas, luego el usuario pidió invertir cuál iba en cada lugar). Texto largo de "Sobre mí" correcto aplicado tras una confusión real: el usuario había mandado primero el texto de Shei pensando que era el de Kat, se aplicó así, y luego se corrigió — el texto que estaba mal puesto en Kat se movió a Shei (que sí era su dueña real).

**Lección de proceso — SQL de varias sentencias pegado junto en Supabase:** en esta sesión, un bloque con 3 `UPDATE` separados por `;` (dos con JSON grande en `content_blocks`, uno simple) se pegó junto y solo el último corrió — los dos primeros, con JSON largo, no se aplicaron sin ningún mensaje de error visible para el usuario (solo vio "Success. No rows returned" igual que cuando sí funciona). Causa no confirmada con certeza (posible límite de la caja de texto del editor de Supabase al pegar bloques largos, o el usuario solo pegó la última parte sin darse cuenta). **Ya no asumir que un bloque con varios `UPDATE` corrió completo solo porque no hubo mensaje de error — siempre verificar en el sitio después, y si algo no aplicó, reenviar cada sentencia por separado en mensajes propios** (así se resolvió).

**Resultado final — los tres perfiles completos:**
- Luz: portada "traje rojo" centrada en la cara (foco bajado dos veces hasta que el usuario confirmó que se veía bien), avatar sin cambios, "Sobre mí" con el texto de +40 años en análisis energético.
- Kat: avatar = foto agachada rosa/blanco, portada = foto sentada en jean, "Sobre mí" con el texto de 7 años + PNL + astrología.
- Shei: foto propia subida por ella misma desde su panel (sin cambios nuestros), "Sobre mí" con el texto de 10 años + marketing de influencia.

### Pendiente
- Footer con redes sociales — sigue sin existir en el sitio.
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas" de los tres perfiles (no es una creadora real).
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 7) — Footer con redes sociales

Pendiente identificado al comparar con las referencias (isabella-cortes.mykajabi.com, valentinaortizf.co) — el sitio no tenía footer en ninguna página. PR [#13](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/13), fusionado y desplegado.

- `src/components/SiteFooter.tsx` — footer con iconos a Instagram, TikTok, YouTube y Facebook de `@katyshei` (cuenta de marca), montado en `layout.tsx` así que aparece en todas las páginas.
- Links usados (marca, confirmados por el usuario):
  - Instagram: https://www.instagram.com/katyshei
  - TikTok: https://www.tiktok.com/@katyshei
  - YouTube: https://youtube.com/@katyshei
  - Facebook: https://www.facebook.com/share/19txkMiPRg/?mibextid=wwXIfr
- **Cuentas personales dadas por el usuario, no usadas todavía — guardadas para cuando se quieran agregar a cada perfil individual:**
  - Shei — TikTok: https://www.tiktok.com/@sheirivera1
  - Kat — Instagram: https://www.instagram.com/kat_rivera_ · TikTok: https://www.tiktok.com/@kat_rivera_ · Facebook: https://www.facebook.com/share/1THuDpBDgZ/?mibextid=wwXIfr
  - Luz: no se recibieron redes personales todavía.

### Pendiente
- Agregar los links personales de cada creadora a su propio perfil, si se quiere (ver arriba).
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas".
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 8) — Redes sociales personales en cada perfil individual

A diferencia del footer general (cuentas de marca @katyshei), el usuario pidió que cada perfil individual (`/luz`, `/kat`, `/shei`) muestre las redes **personales** de esa creadora específica, debajo de su bio corta. PR [#14](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/14), fusionado y desplegado.

- Nuevo `src/lib/creatorSocials.ts`: mapa `slug → {instagram?, tiktok?, facebook?, youtube?}` — si una red no está definida, simplemente no se muestra el ícono (confirmado explícitamente por el usuario: "si alguna no tiene alguno de esos, no pasa nada").
- Nuevo `src/components/ProfileSocialLinks.tsx`, montado en `ProfilePreview.tsx` (que ahora acepta `slug` opcional) — se usa tanto en la página pública como en la vista previa en vivo del editor Puck en el panel.
- Redes guardadas hasta ahora:
  - Luz: TikTok `@consejos_deluz` (único dato que se tenía de ella)
  - Kat: Instagram `@kat_rivera_`, TikTok `@kat_rivera_`, Facebook
  - Shei: TikTok `@sheirivera1`

### Pendiente
- Faltan redes de Luz (Instagram, Facebook, YouTube) y de Shei (Instagram, Facebook, YouTube) — pendiente que el usuario las pase si quiere completarlas.
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas".
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 9) — QA funcional del sitio, bug arreglado, redes completas

**QA funcional de todo el sitio** (landing, los 3 perfiles, /evento, /login, /registro) hecho con un sub-agente navegando el sitio real. Resultado: todo funciona correctamente excepto un bug real encontrado y arreglado —

- **Bug:** el tab "Sobre mí" en los tres perfiles tenía `href="#"` (no hacía nada) en `ProfilePreview.tsx`, mientras "Cursos" y "Otras Poderosas" sí tenían anclas reales. PR [#15](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/15). Corregido a `#sobre-mi` con el `id` correspondiente en el bloque de contenido.
- Confirmado funcionando: las 3 tarjetas de creadoras, podcast, footer, formulario de `/evento` (sí llega a Wompi, no se completó un pago real), `/login`/`/registro` sin errores de consola, tabs y redes de cada perfil.

**Redes sociales por perfil — completadas** (PR [#16](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/16)):
- Luz: Instagram + TikTok (`@consejos_deluz`) — sin Facebook, confirmado explícitamente por el usuario ("no tiene tantos seguidores").
- Shei: Instagram (`@sheinarivera_`), TikTok (`@sheirivera1`), Facebook, YouTube (`@sheinarivera1`).
- Kat: se mantiene Instagram + TikTok (`@kat_rivera_`); se le quitó el Facebook que tenía — era de Shei, no de Kat (confirmado con el usuario, no es cuenta compartida).
- El usuario confirmó explícitamente el diseño: redes de marca (@katyshei) solo en el footer general; redes personales de cada una solo en su propio perfil, sin mezclar.

**Pedido grande en curso — "revisión completa + marketing/conversión":** el usuario pidió un QA de punta a punta + investigar qué hace que las páginas de cursos/membresías vendan más (diseño, colores, video, movimiento, trucos psicológicos) y aplicarlo. **Se le aclaró y aceptó explícitamente:** no se va a implementar prueba social falsa (números inventados de "ya compraron X personas") — es publicidad engañosa real bajo la Ley 1480 de protección al consumidor en Colombia y viola términos de las pasarelas de pago. Si se quiere mostrar ventas/cupos, tiene que ser el conteo real desde la base de datos. Investigación inicial (ver fuentes abajo) confirma: claridad en 5 segundos, prueba social verificable, urgencia real (ya existe con la fecha del evento), video/preview, CTA repetido, mobile-first.
- Fuentes: [Course Landing Pages That Convert](https://mewayz.com/xh/blog/course-landing-pages-that-convert-7-design-principles-that-actually-work), [5 Ethical Ways to Create Urgency](https://www.growthsuite.net/blog/5-ethical-ways-to-create-urgency-without-lying-to-your-customers), [The Science of Scarcity](https://tenten.co/shopify/urgency-scarcity-shopify/)
- Quedó pendiente que el usuario elija por dónde seguir (contador real de cupos vendidos / video en el evento / página de venta del curso nuevo cuando esté listo) — todavía sin decidir al cierre de esta sesión.

### Pendiente
- Decidir y ejecutar la siguiente mejora de conversión (ver arriba).
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas".
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 10) — Contador real de cupos del evento

Primera mejora de conversión real implementada de las tres que pidió el usuario (contador real / video / página del curso). PR [#17](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/17), fusionado y desplegado.

- Nuevo `src/lib/eventStats.ts`: cuenta en vivo (`orders.status = 'approved'` para el producto `type='event'`) usando el cliente admin — nunca un número inventado.
- Landing y `/evento` muestran "Quedan X cupos de Y" cuando el producto tiene `capacity` definida; si no, cae a "X personas ya se unieron"; si no hay ventas, "Cupos limitados".
- El usuario pidió bajar la capacidad real del evento de 50 a 23 (no fue un cambio de display falso — es la capacidad real del aforo) vía SQL (`UPDATE products SET capacity = 23 WHERE type = 'event'`). Confirmado en producción: "Quedan 22 cupos de 23" (ya había 1 boleta vendida).

**Las otras dos partes del pedido quedan pausadas a propósito, decisión del usuario:**
- Video en la sección del evento: no tiene grabado todavía, se monta cuando lo tenga.
- Página de venta del curso nuevo: todavía en edición, se arma cuando tenga nombre/precio/descripción definidos.

### Pendiente
- Video del evento cuando el usuario lo tenga.
- Página de venta del curso nuevo cuando esté definido (nombre, precio, descripción).
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas".
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.

## 2026-10-28 (continuación 11) — Sección "Metodología Poderosa" (lista de espera del curso)

Reemplaza "El GPS de tu vida" en la landing. PR [#18](https://github.com/PoderosasORG/PODEROSASPROYECT/pull/18), fusionado y desplegado. Probado de punta a punta en local (formulario real, guarda en DB).

- Título confirmado por el usuario: "Metodología Poderosa" (puede cambiar después).
- Copy: "un curso, tres mentoras", cada módulo enseñado por una desde su área (Kat: comunicación/estrategia digital; Shei: psicología/bienestar; Luz: autoconocimiento/energía), cartilla + entregables.
- **Decisión explícita del usuario:** no es checkout real todavía — es una lista de espera (correo → tabla `waitlist_signups`), porque el curso sigue en edición sin nombre/precio definitivo. Cuando esté listo, esta sección se reemplaza por la página de venta real.
- Beneficios por inscribirse primero: el usuario propuso ideas (30% en eventos presenciales, ebook de regalo) pero no confirmó los números exactos — se dejó copy genérico ("beneficios exclusivos para quienes se inscriban primero") a propósito, para no prometer algo no confirmado. Pendiente definir el beneficio exacto.
- `waitlist_signups`: tabla sin políticas RLS públicas — solo el servidor (admin/service role) puede escribir, nadie puede leer la lista desde el navegador. Duplicados (mismo correo + misma fuente) no dan error al usuario, solo confirman igual.
- **Nota de proceso:** durante la verificación en el navegador, un clic sin `tabId` explícito aterrizó por accidente en una pestaña de producción que el usuario tenía abierta (no en la de desarrollo local) — no se guardó ningún dato de prueba ahí, pero quedó como recordatorio: siempre pasar `tabId` explícito cuando haya más de una pestaña abierta, en vez de confiar en la pestaña "activa" por defecto.

### Pendiente
- Definir el beneficio exacto por inscribirse primero en la lista de espera (el usuario mencionó 30% en eventos + ebook como ideas, sin confirmar).
- Video del evento cuando el usuario lo tenga.
- Página de venta real del curso cuando tenga nombre/precio/descripción definidos — reemplazaría esta sección de lista de espera.
- Limpiar el perfil de prueba "QA CRM" que sigue apareciendo en "otras poderosas".
- Lo de siempre: Wompi independiente para Kat y Luz, DB de pruebas separada, cupones, límite de tasa, deploy automático de Vercel.
