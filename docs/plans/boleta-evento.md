# Spec — Compra de boleta para el evento en vivo

## Objetivo
Alguien entra a la web, compra su cupo para el show en vivo de Kat, Shei y Luz en pocos minutos, sin crear cuenta, y le llega la boleta (con QR) al correo. En la entrada, alguien del equipo escanea el QR y lo marca como usado.

Esto es independiente del sistema de membresías/contenido (ese sigue exigiendo login, no se toca).

## Flujo (rebanada delgada, sin estilos todavía)
1. Página del evento (puede ser una ruta simple, ej. `/evento`) con la info básica y botón "Comprar cupo".
2. Formulario: nombre + correo (sin contraseña).
3. Se crea una orden "pendiente" ligada a ese nombre/correo (no a una cuenta) y se redirige a Wompi.
4. Wompi confirma el pago → nuestro webhook ya existente marca la orden como aprobada.
5. Al aprobarse: se genera un código único para esa boleta y se envía un correo con ese código (como QR) a quien compró.
6. Página `/escaner` (protegida, solo para el equipo) donde se escanea el QR: si es válido y no se ha usado, lo marca como "usado" y lo muestra en pantalla; si ya se usó, avisa en rojo.

## Cambios en base de datos
`orders` gana dos columnas nuevas, ambas opcionales:
- `buyer_name text`
- `buyer_email text`
- `buyer_id` deja de ser obligatorio (`not null` → nullable) **solo para poder dejarlo vacío en compras de invitado**. Las compras de productos con cuenta (digital, curso, membresía) siguen llenándolo igual que hoy; no se les quita nada.

Nueva tabla `event_tickets` (uno por boleta comprada):
- `id uuid` (este es el código que va en el QR)
- `order_id uuid` → `orders.id`
- `product_id uuid` → `products.id`
- `checked_in_at timestamptz` (null = no ha entrado todavía)
- `created_at timestamptz`

No se toca `event_registrations` (esa tabla asume comprador con cuenta — se deja para cuando se retome membresías/eventos "logueados", si aplica).

## Qué decide el usuario todavía
- Proveedor de correo: Resend (gratis, fácil) vs. Gmail (ya lo tiene abierto). Recomiendo Resend por ser más simple de automatizar sin tocar su cuenta personal de Gmail — pero es su llamada.
- Confirmar: ¿el evento ya tiene fecha, lugar, precio y cupo máximo? Hace falta para la página y para limitar las ventas a los cupos disponibles.

## Fuera de alcance ahora (pospuesto)
- Diseño visual bonito del home y del evento.
- Reenvío de boleta si la pierden, cambios de nombre, reembolsos.
- Panel para que la creadora edite el evento desde `/panel` (por ahora el evento se crea a mano en la base de datos, como ya se hace con `promote_creators.sql`).

## Plan por tareas (orden de ejecución)
1. Migración SQL (columnas en `orders` + tabla `event_tickets`) — se entrega en el chat para que el usuario la pegue.
2. `/api/checkout-evento`: crea la orden sin exigir sesión, a partir de nombre/correo.
3. Página `/evento` con el formulario y el botón de compra.
4. Webhook: al aprobar, crear la fila en `event_tickets` y enviar el correo con el QR.
5. Página `/escaner`: leer QR, validar, marcar check-in.
6. Prueba de punta a punta real en poderosas.org (no solo local) con una compra de prueba.
