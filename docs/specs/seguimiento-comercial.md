# Seguimiento comercial — lanzamiento Metodología PODEROSAS

Pedido por Kat el 2026-11-21. Panel: `/admin/seguimiento`.

## Qué se identifica
| Etapa | Cómo se sabe |
|---|---|
| Visitó la landing | Cookie anónima `pod_vid` + `/api/visita` → `landing_visits` (sin nombre, correo ni IP) |
| Inició el checkout | Pedido de la Metodología creado (con nombre/correo) |
| Abandonó el checkout | Pedido sin pagar por más de 2 horas, sin transacción en Wompi |
| Pago pendiente | Pedido `pending` con transacción en Wompi (ej. PSE en proceso) |
| Compró | Pedido `approved` (se excluyen las pruebas `PRUEBA…`) |
| Pidió orientación | Formulario «Quiero orientación por WhatsApp» (`/api/orientacion`) |

## Estados comerciales (`sales_leads.status`)
Nuevo contacto · Interesada · Solicitó información · Checkout iniciado · Pago pendiente · Compra confirmada · No interesada.
Los pedidos fijan el estado automáticamente (una compra siempre manda). «No interesada» marcado a mano gana sobre lo demás, salvo una compra.

## Autorización y contacto
- Solo se puede abrir WhatsApp con un contacto que tenga **número y autorización** (`whatsapp_consent`).
- La autorización llega del formulario de orientación (casilla obligatoria) o la registra el equipo indicando cómo se dio (ej. «nos escribió primero»).
- Nada se envía automáticamente: el botón abre WhatsApp con la plantilla y una persona del equipo envía. Cada apertura queda en `sales_contact_log`.

## Plantillas (`src/lib/sales/templates.ts`)
Agradecimiento por la masterclass · Presentación de la metodología · Explicación de los bonos · Respuesta a dudas · Recordatorio de inscripción · Cierre de lanzamiento · Bienvenida a nuevas integrantes.
Cálidas, sin presión, sin contadores falsos ni culpa. `{fecha}` usa la fecha real de cierre del precio especial.

## Configuración (Vercel)
- `ORIENTATION_WHATSAPP_NUMBER`: número del equipo para el botón de orientación (+57 314 508 9821).
