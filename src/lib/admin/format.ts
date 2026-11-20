export function formatCop(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en Colombia, como YYYY-MM-DD. */
export function todayBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

/**
 * Periodo del reporte a partir de ?desde=&hasta= (YYYY-MM-DD, hora de
 * Colombia). Por defecto: el mes en curso.
 */
export function resolvePeriod(desde?: string, hasta?: string) {
  const today = todayBogota();
  const from = desde && DATE_RE.test(desde) ? desde : `${today.slice(0, 7)}-01`;
  const to = hasta && DATE_RE.test(hasta) ? hasta : today;
  return {
    from,
    to,
    // Límites en UTC equivalentes a medianoche de Colombia (UTC-5).
    fromIso: new Date(`${from}T00:00:00-05:00`).toISOString(),
    toIsoExclusive: new Date(new Date(`${to}T00:00:00-05:00`).getTime() + 86_400_000).toISOString(),
  };
}

export function quickPeriods() {
  const today = todayBogota();
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return [
    { label: "Este mes", desde: `${y}-${pad(m)}-01`, hasta: today },
    {
      label: "Mes pasado",
      desde: `${prevY}-${pad(prevM)}-01`,
      hasta: `${prevY}-${pad(prevM)}-${pad(lastDay(prevY, prevM))}`,
    },
    { label: "Este año", desde: `${y}-01-01`, hasta: today },
    { label: "Todo", desde: "2024-01-01", hasta: today },
  ];
}
