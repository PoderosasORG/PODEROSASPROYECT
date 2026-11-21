import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";

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

export const INSTALLMENT_PLANS: Record<string, InstallmentConfig> = {
  // Metodología PODEROSAS: $497.000 en 3 cuotas fijas.
  // 1.ª cuota → mes 1 · 2.ª cuota → mes 2 · 3.ª cuota → meses 3 a 6.
  [METODOLOGIA_PODEROSAS_PRODUCT_ID]: {
    totalCents: 49_700_000,
    graceDays: 3,
    installments: [
      { amountCents: 16_566_700, unlocksThroughMonth: 1 }, // $165.667
      { amountCents: 16_566_700, unlocksThroughMonth: 2 }, // $165.667
      { amountCents: 16_566_600, unlocksThroughMonth: 6 }, // $165.666
    ],
  },
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

export function installmentConfigFor(productId: string): InstallmentConfig | null {
  const plan = INSTALLMENT_PLANS[productId];
  return plan ? validatePlan(plan) : null;
}
