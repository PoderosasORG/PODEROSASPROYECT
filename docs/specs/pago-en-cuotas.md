# Pago en cuotas · Metodología PODEROSAS

## Reglas
- Total $497.000 en 3 cuotas fijas: $165.667 + $165.667 + $165.666.
- Cuota 1 (al inscribirse) habilita el mes 1. Cuota 2 habilita el mes 2. Cuota 3 habilita los meses 3 a 6.
- Las fechas se cuentan desde el día del primer pago. La cuota 2 vence al cumplir 1 mes y la 3 al cumplir 2 meses.
- 3 días de gracia: si no paga, el acceso se pausa 3 días después de la fecha límite y vuelve apenas paga.
- Los 3 bonos llegan con la primera cuota (igual que de contado).
- El contado sigue en $397.000 mientras dure el precio especial.

## Dónde se cambia
`src/lib/installments/config.ts`: valor de cada cuota, hasta qué mes habilita y días de gracia. Solo afecta planes nuevos: cada plan guarda una copia de su calendario.

## Cómo funciona
1. La compradora elige «o paga en 3 cuotas», ve el calendario y acepta las condiciones.
2. `/api/checkout` crea el plan (`installment_plans`) y el pedido de la cuota 1.
3. El webhook de Wompi aprueba la cuota, fija `access_expires_at` hasta el fin de su tramo (+ gracia) y manda el correo con la próxima fecha y el link privado `/cuotas/<token>`.
4. El cron diario `/api/cron/installment-reminder` envía: recordatorio 3 días antes, aviso el día que vence y aviso de pausa. Cada uno una sola vez por cuota.
5. Si el acceso se vence, la página del curso muestra «Recuerda pagar tu cuota para habilitar el siguiente nivel» con el botón de pago.
6. `/admin/cuotas` muestra cada plan: estado, cuotas pagadas, próxima fecha y link de pago.

## Requiere
Correr `supabase/installments_schema.sql` en Supabase antes de publicar.
