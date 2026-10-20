# Bitácora — Poderosas.org

Registro de decisiones, lo hecho y lo pendiente. Actualizar antes de cada `/clear`.

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

### Pendiente
- Probar `/escaner` con sesión real de una de las creadoras (falta hacerlo).
- Confirmar precio y cupo real del evento (hoy: placeholder $1.500 / 50 cupos) y publicar el producto (`is_published = true`) cuando esté listo para vender de verdad.
- Antes de vender boletas reales: push de la rama, PR, aprobación del usuario y merge.
- Dominio poderosas.org: comprado en Porkbun, DNS sin configurar todavía. Deploy en Vercel pendiente — necesario para que el webhook de Wompi funcione solo (sin simulación manual).
- Registrar la URL del webhook en Wompi (Desarrolladores → Eventos) una vez haya dominio real.
- Base de datos de pruebas separada de producción: sigue pospuesta (ver nota arriba) — se trabajó esta función directo en el único proyecto de Supabase porque no hay visitas reales todavía.

### Pospuesto (confirmado por el usuario, no tocar ahora)
- Diseño visual / estética del sitio.
- Resto del panel de creadoras: entrega de contenido post-compra, membresías, UI de llaves Wompi.
