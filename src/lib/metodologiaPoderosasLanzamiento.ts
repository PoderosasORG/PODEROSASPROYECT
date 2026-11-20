// Mecánica del lanzamiento de Metodología PODEROSAS 2026–2027: precio
// especial hasta el sábado 21 de nov. 11:59 p.m. (hora Colombia, UTC-5),
// luego vuelve al precio regular. La fecha vive aquí (no en la base de
// datos) porque es un evento único de este lanzamiento — cuando pase,
// este archivo deja de tener efecto y el precio regular (en la base de
// datos) queda como el único precio.
//
// Sábado 21 de nov. 2026, 23:59:59 hora Colombia (UTC-5) = domingo
// 22 de nov. 2026, 04:59:59 UTC.
export const LAUNCH_DEADLINE = new Date("2026-11-22T04:59:59Z");

export const LAUNCH_PRICE_CENTS = 39_700_000; // $397.000 COP
export const REGULAR_PRICE_CENTS = 49_700_000; // $497.000 COP

// Producto real "Metodología Poderosa" ya publicado en la base de datos
// (sembrado por supabase/metodologia_poderosa_schema.sql). Se ancla por
// id, igual que el resto del sistema ancla este producto por
// course_categories y no por título.
export const METODOLOGIA_PODEROSAS_PRODUCT_ID = "20a9f3e0-78f5-4708-b476-1033510a5649";

export function isLaunchPriceActive(now: Date = new Date()): boolean {
  return now.getTime() < LAUNCH_DEADLINE.getTime();
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
