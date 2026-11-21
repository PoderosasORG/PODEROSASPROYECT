import type { InstallmentConfig } from "./config";

// Cálculos de fechas del plan de cuotas (todo en UTC; se muestra en hora
// de Colombia al formatear).

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Fecha límite de la cuota n (1-indexada). La primera se paga al comprar. */
export function dueDate(schedule: InstallmentConfig, accessStart: Date, n: number) {
  if (n <= 1) return accessStart;
  return addMonths(accessStart, schedule.installments[n - 2].unlocksThroughMonth);
}

/** Hasta cuándo hay acceso después de pagar la cuota n (incluye la gracia). */
export function accessUntilAfter(schedule: InstallmentConfig, accessStart: Date, n: number) {
  const step = schedule.installments[n - 1];
  const end = addMonths(accessStart, step.unlocksThroughMonth);
  const isLast = n >= schedule.installments.length;
  return isLast ? end : addDays(end, schedule.graceDays);
}

/** Día en que se pausa el acceso si no paga la cuota n. */
export function pauseDate(schedule: InstallmentConfig, accessStart: Date, n: number) {
  return addDays(dueDate(schedule, accessStart, n), schedule.graceDays);
}

export function formatCopCents(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("es-CO")}`;
}

export function formatDateCo(date: Date | string) {
  return new Date(date).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}
