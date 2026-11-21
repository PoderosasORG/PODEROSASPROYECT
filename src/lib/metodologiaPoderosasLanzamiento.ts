// Mecánica del lanzamiento de Metodología PODEROSAS 2026–2027: precio
// especial de $397.000 (de contado o en 3 cuotas) con 3 bonos, hasta el
// martes 1 de diciembre de 2026, 11:59 p.m. (hora Colombia, UTC-5). Luego
// vuelve al precio regular de $497.000. Esta fecha es la ÚNICA fuente de
// verdad: home, página del curso, checkout, cuotas, FAQ, contadores y
// plantillas de WhatsApp la leen de aquí.
//
// Martes 1 de dic. 2026, 23:59:59 hora Colombia (UTC-5) = miércoles
// 2 de dic. 2026, 04:59:59 UTC. (Antes: sábado 21 de nov.; se extendió
// públicamente el 2026-11-21.)
export const LAUNCH_DEADLINE = new Date("2026-12-02T04:59:59Z");

export const LAUNCH_PRICE_CENTS = 39_700_000; // $397.000 COP
export const REGULAR_PRICE_CENTS = 49_700_000; // $497.000 COP

// Producto real "Metodología Poderosa" ya publicado en la base de datos
// (sembrado por supabase/metodologia_poderosa_schema.sql). Se ancla por
// id, igual que el resto del sistema ancla este producto por
// course_categories y no por título.
export const METODOLOGIA_PODEROSAS_PRODUCT_ID = "20a9f3e0-78f5-4708-b476-1033510a5649";

// Extensión opcional de la promoción. Se configura SOLO en las variables
// de entorno del servidor (Vercel), no en el código, porque el repositorio
// es público:
//   PROMO_EXTENSION_UNTIL   = fecha ISO en que termina la extensión
//   PROMO_EXTENSION_MESSAGE = anuncio que se muestra mientras dura
// Mientras la fecha original no haya pasado, la extensión no se nota.
function extensionUntil(): Date | null {
  const raw = process.env.PROMO_EXTENSION_UNTIL;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) || d.getTime() <= LAUNCH_DEADLINE.getTime() ? null : d;
}

/** Fecha en que termina la promoción vigente (original o extendida). */
export function promoDeadline(now: Date = new Date()): Date {
  const ext = extensionUntil();
  return ext && now.getTime() >= LAUNCH_DEADLINE.getTime() ? ext : LAUNCH_DEADLINE;
}

/** Último momento en que una compra cuenta como "de lanzamiento". */
export function promoFinalDeadline(): Date {
  return extensionUntil() ?? LAUNCH_DEADLINE;
}

export function isLaunchPriceActive(now: Date = new Date()): boolean {
  return now.getTime() < promoDeadline(now).getTime();
}

/** true solo durante la extensión (después de la fecha original). */
export function isPromoExtended(now: Date = new Date()): boolean {
  return isLaunchPriceActive(now) && now.getTime() >= LAUNCH_DEADLINE.getTime();
}

/** Anuncio de la extensión (vacío si no hay o si no está vigente). */
export function promoExtensionMessage(now: Date = new Date()): string {
  return isPromoExtended(now) ? (process.env.PROMO_EXTENSION_MESSAGE ?? "").trim() : "";
}

/** "sábado 21 de nov., 11:59 p. m." en hora de Colombia. */
export function promoDeadlineLabel(now: Date = new Date()): string {
  const d = promoDeadline(now);
  const day = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short", timeZone: "America/Bogota" });
  const time = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  return `${day.replace(",", "")}, ${time}`;
}

/**
 * Precio efectivo para el producto de Metodología PODEROSAS en este
 * instante. Para cualquier otro producto, devuelve su precio normal sin
 * tocar nada — este override solo aplica al id de arriba.
 */
export function effectivePriceCents(
  productId: string,
  basePriceCents: number,
  now: Date = new Date(),
): number {
  if (productId !== METODOLOGIA_PODEROSAS_PRODUCT_ID) return basePriceCents;
  return isLaunchPriceActive(now) ? LAUNCH_PRICE_CENTS : REGULAR_PRICE_CENTS;
}
