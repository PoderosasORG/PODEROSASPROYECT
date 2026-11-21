# Medición del embudo · Metodología PODEROSAS 2026–2027

## Qué se mide y dónde
| Métrica | Fuente |
|---|---|
| Visitas a la landing / personas distintas | `landing_visits` (VisitBeacon, cookie anónima `pod_vid`) |
| Fuente de tráfico | cookie `pod_origin` (UTM o referer), guardada en visitas, clics y pedidos |
| Clics en botones de compra | `funnel_events` (`cta_comprar`, `cta_ir_a_metodologia`) + GA4 |
| Checkouts iniciados | pedidos creados en `orders` + GA4 `begin_checkout` |
| Pagos aprobados / rechazados | estado del pedido que confirma el webhook de Wompi |
| Abandono | pedidos `pending` con más de 2 h |
| Ingresos brutos y cupos promo | pedidos aprobados (cupo promo = precio de lanzamiento) |

Tablero: `/admin/lanzamiento` (se actualiza solo cada minuto). Los pedidos `PRUEBA-…` no cuentan.

## GA4 y Meta
- GA4 (`G-EN3BCEYTZE`) ya carga en todo el sitio, con modo de consentimiento: publicidad apagada por defecto.
- **Compra**: solo desde el servidor (webhook), con el pago confirmado, una vez por pedido (`analytics_sent`). Necesita `GA_API_SECRET` en Vercel (GA4 → Administrar → Flujos de datos → Secretos de la API de Measurement Protocol). Sin esa variable, no se envía nada.
- **Rechazo**: evento GA4 `payment_declined` (solo GA4).
- **Meta Pixel**: apagado hasta configurar `NEXT_PUBLIC_META_PIXEL_ID`. Entonces aparece el aviso de cookies y el Pixel carga solo si la persona acepta. Compra por Conversions API con `META_CAPI_TOKEN`, solo si la persona aceptó (hay cookie `_fbp`), con `event_id` = id del pedido.
- Nunca se envía nombre, correo, teléfono, ciudad ni dirección a GA4 ni a Meta: solo id del pedido, valor, moneda, producto e identificadores anónimos de sus cookies.

## Links por canal
En `src/lib/analytics/utm.ts` (y visibles en el tablero). Los mensajes de WhatsApp de /admin/seguimiento ya usan el de WhatsApp.
