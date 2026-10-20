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

### Pendiente (una vez resuelto lo anterior)
- Spec corto del flujo de boletas (una página).
- Migración SQL para invitados (si se aprueba esa vía).
- Endpoint de compra de boleta sin cuenta.
- Generar QR + enviar correo tras webhook de Wompi aprobado.
- Página/endpoint de escaneo para la entrada (rol admin/creadora).
- Decidir proveedor de correo (Resend vs. Gmail) — pendiente de confirmar con el usuario.
- Dominio poderosas.org: comprado en Porkbun, DNS sin configurar todavía. Deploy en Vercel pendiente.

### Pospuesto (confirmado por el usuario, no tocar ahora)
- Diseño visual / estética del sitio.
- Resto del panel de creadoras: entrega de contenido post-compra, membresías, UI de llaves Wompi.
