# Flujo de bienvenida — Metodología PODEROSAS

Pedido por Kat el 2026-11-21. Se activa **solo** cuando Wompi confirma el pago (webhook, `status = approved`, primera vez).

## Pasos
1. **Registrar a la alumna** → `student_journey` (estado *Compra confirmada*).
2. **Crear o activar su cuenta** → el webhook crea la cuenta o vincula la existente y genera el enlace para crear contraseña.
3. **6 meses de acceso** → `orders.access_expires_at` (ya existía).
4–11. **Correo de bienvenida** (`src/lib/welcome/welcomeEmail.ts`): instrucciones de cuenta, acceso y fecha de vencimiento, módulos disponibles y próximos (con fecha planeada), comunidad de WhatsApp, calendario de encuentros, 3 bonos (se anuncian en vivo por la comunidad), ebook 50 acuerdos y material descargable.
   El panel del curso (`AccessOverview`) muestra lo mismo, siempre actualizado.

## Estados (`student_journey`)
| Estado | Cuándo se marca |
|---|---|
| Compra confirmada | Webhook aprobado |
| Cuenta activada | Ya tenía cuenta usable, crea su contraseña (`/api/cuenta/activada`) o entra al curso |
| Primer ingreso | Primera vez que abre el curso con su compra |
| Primer módulo iniciado | Primera vez que carga un video (`/playback`) |
| Primera actividad completada | Primera vez que marca un módulo como finalizado (`/progress`) |
| Participación en encuentros | Asistencia marcada en `/admin/alumnas` (`live_session_attendance`) |

## Sin duplicados
`email_log.dedupe_key` es único (`bienvenida:<order_id>`). Si Wompi repite el aviso o llegan dos a la vez, solo el primero envía. Si el envío falla, la reserva se libera para que un reintento lo intente de nuevo.

## Comunicaciones
- **Operativo**: compra, acceso, calendario, vencimiento. Siempre se envía.
- **Marketing**: solo con `communication_preferences.marketing_opt_in = true` (por defecto `false`). Se activa con la casilla opcional del checkout o en `/preferencias` (enlace con token en cada correo, o con sesión iniciada). Usar `canSendMarketing(email)` antes de cualquier envío promocional.

## Configuración privada (Vercel, no en el repo público)
- `WHATSAPP_COMMUNITY_URL`: enlace de la comunidad privada.

## Administración
`/admin/alumnas`: embudo de estados, tabla de alumnas, encuentros grupales (crear/eliminar, asistencia) y fecha planeada de publicación de cada módulo.
