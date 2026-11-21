import { METODOLOGIA_PODEROSAS_PRODUCT_ID, isLaunchPriceActive } from "@/lib/metodologiaPoderosasLanzamiento";

// ─── Pago en cuotas: AQUÍ se parametriza ─────────────────────────────────
// Cada producto que se puede pagar en cuotas tiene su plan:
//   - amountCents: valor fijo de cada cuota (en centavos, como Wompi).
//   - unlocksThroughMonth: hasta qué mes del acceso habilita esa cuota,
//     contado desde el día del primer pago.
//   - graceDays: días de gracia después de la fecha límite antes de pausar
//     el acceso (no aplica a la última cuota, que ya cubre todo).
// Las cuotas deben sumar totalCents exactamente (lo revisa validatePlan).
// Cambiar esto solo afecta a planes NUEVOS: cada plan guarda una copia de
// su calendario al crearse, así nadie ve cambiar las condiciones que aceptó.

export type InstallmentStep = { amountCents: number; unlocksThroughMonth: number };
export type InstallmentConfig = {
  totalCents: number;
  graceDays: number;
  installments: InstallmentStep[];
};

// Metodología PODEROSAS — 1.ª cuota → mes 1 · 2.ª → mes 2 · 3.ª → meses 3 a 6.
const METODOLOGIA_GRACE_DAYS = 3;

// Precio especial de lanzamiento ($397.000), vigente hasta la fecha de
// metodologiaPoderosasLanzamiento.ts (1 de dic. 2026).
const METODOLOGIA_LAUNCH: InstallmentConfig = {
  totalCents: 39_700_000,
  graceDays: METODOLOGIA_GRACE_DAYS,
  installments: [
    { amountCents: 13_233_400, unlocksThroughMonth: 1 }, // $132.334
    { amountCents: 13_233_300, unlocksThroughMonth: 2 }, // $132.333
    { amountCents: 13_233_300, unlocksThroughMonth: 6 }, // $132.333
  ],
};

// Precio regular ($497.000), después del lanzamiento.
const METODOLOGIA_REGULAR: InstallmentConfig = {
  totalCents: 49_700_000,
  graceDays: METODOLOGIA_GRACE_DAYS,
  installments: [
    { amountCents: 16_566_700, unlocksThroughMonth: 1 }, // $165.667
    { amountCents: 16_566_700, unlocksThroughMonth: 2 }, // $165.667
    { amountCents: 16_566_600, unlocksThroughMonth: 6 }, // $165.666
  ],
};

export const INSTALLMENT_PLANS: Record<string, (now: Date) => InstallmentConfig> = {
  [METODOLOGIA_PODEROSAS_PRODUCT_ID]: (now) => (isLaunchPriceActive(now) ? METODOLOGIA_LAUNCH : METODOLOGIA_REGULAR),
};

export function validatePlan(plan: InstallmentConfig) {
  const sum = plan.installments.reduce((s, i) => s + i.amountCents, 0);
  if (sum !== plan.totalCents) throw new Error(`Las cuotas suman ${sum} y el total es ${plan.totalCents}`);
  plan.installments.forEach((step, i) => {
    if (i > 0 && step.unlocksThroughMonth <= plan.installments[i - 1].unlocksThroughMonth) {
      throw new Error("Cada cuota debe habilitar más meses que la anterior");
    }
  });
  return plan;
}

/** Plan de cuotas vigente para el producto en este momento (o null). */
export function installmentConfigFor(productId: string, now: Date = new Date()): InstallmentConfig | null {
  const pick = INSTALLMENT_PLANS[productId];
  return pick ? validatePlan(pick(now)) : null;
}

/** Valor de la primera cuota de la Metodología, vigente hoy (para textos). */
export function firstInstallmentCents(productId: string = METODOLOGIA_PODEROSAS_PRODUCT_ID): number | null {
  return installmentConfigFor(productId)?.installments[0].amountCents ?? null;
}

/** Todos los valores de primera cuota posibles (para reconocer cupos de lanzamiento). */
export const LAUNCH_FIRST_INSTALLMENT_CENTS = METODOLOGIA_LAUNCH.installments[0].amountCents;
