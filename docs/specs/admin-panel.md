# Panel interno /admin — spec

Pedido por Kat el 2026-11-20. Decisión: **las 3 administradoras (Kat, Shei, Luz) ven todo**, incluidas las ventas de cada una. Esto cambia la regla anterior de «cada creadora solo ve lo suyo», pero solo dentro de /admin; /panel/clientes sigue igual.

## Acceso
- Tabla `admin_members` (lista explícita). No basta con ser creadora: agregar una creadora nueva no le da acceso a las finanzas.
- `requireAdmin()` en el layout **y** en cada Server Action / ruta (las acciones se pueden llamar con un POST directo).
- Lecturas con service role, siempre después de `requireAdmin()`.

## Fase 1 (este PR)
1. **Reporte financiero** (`/admin`), por periodo (este mes, mes pasado, este año, rango):
   ingresos brutos (Wompi y Nequi directo por separado) − comisión Wompi − costos = utilidad neta.
   Desglose por cuenta receptora (qué Wompi recibió cada pago) y por producto.
   - La comisión de Wompi no viene en el webhook: se estima con la tarifa publicada (2,65 % + $700 + IVA 19 %). Se guarda en `wompi_fee_cents` al aprobar. No incluye retenciones. Fuente de verdad: el extracto de Wompi.
   - Se excluyen las órdenes de prueba (`wompi_transaction_id` que empieza por `PRUEBA`).
2. **CRM** (`/admin/crm`): una fila por persona (agrupado por correo). Nombre, correo, teléfono con indicativo, dirección, ciudad/país, origen, método de pago, cupón, última compra, número de compras, total, productos y cuenta receptora.
   - Datos nuevos que se guardan desde ahora: `origin` (cookie `pod_origin` de la primera visita: utm_source, ?ref= o el sitio externo); dirección y teléfono (Wompi checkout con `collect-shipping=true` → `transaction.shipping_address` / `customer_data`); `wompi_payment_method`.
   - Las compras anteriores quedan con «—» en esos campos.
3. **Gastos y suscripciones** (`/admin/gastos`):
   - Suscripciones: servicio, costo, moneda, valor en pesos, periodicidad, tarjeta (nombre + **solo últimos 4 dígitos**), quién paga, a nombre de quién, próxima renovación, activa.
   - Gastos: concepto, categoría, valor (y en pesos), fecha, quién pagó, medio, evento o suscripción relacionada, **factura** (PDF/foto, máx. 4 MB) en el bucket privado `facturas`, que se abre con un link firmado de 5 min.

## Fases siguientes (un PR cada una)
- Códigos de regalo y cupones (afecta el precio en el checkout y la firma de integridad de Wompi).
- Referidos (link `?ref=` ya se captura como origen; falta la comisión por referidora).
- Inventario (cupos de eventos, productos físicos).
- PQR (formulario público + bandeja con estados).

## Despliegue
1. Kat pega `supabase/admin_panel_schema.sql` en el SQL Editor (antes del merge: el checkout escribe la columna `origin`).
2. Merge → Vercel despliega.
3. Verificar: entrar a /admin con una de las 3 cuentas; con Susy prueba debe redirigir a /panel.
