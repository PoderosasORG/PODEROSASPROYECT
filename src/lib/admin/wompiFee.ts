// Comisión estimada de Wompi por transacción aprobada (Colombia).
//
// Tarifa publicada del plan general en línea: 2,65 % + $700 COP por
// transacción, más IVA (19 %) sobre la comisión. Verificado en
// noviembre de 2026 en las páginas de Bancolombia/Wompi; las tarifas
// pueden cambiar o ser negociadas por comercio, así que el valor real
// siempre es el del extracto de Wompi. No incluye retenciones
// (ReteFuente/ReteICA/ReteIVA), que dependen de cada comercio.
export const WOMPI_PERCENT = 0.0265;
export const WOMPI_FIXED_COP = 700;
export const WOMPI_IVA = 0.19;

/** Comisión estimada en centavos (amountCents también en centavos). */
export function estimateWompiFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  const base = amountCents * WOMPI_PERCENT + WOMPI_FIXED_COP * 100;
  return Math.round(base * (1 + WOMPI_IVA));
}
