export type InventoryItem = {
  id: string;
  category: string;
  event_name: string;
  event_product_id: string | null;
  item_category: string | null;
  item: string;
  quantity: number | null;
  unit_cost_cents: number | null;
  total_cents: number | null;
  store: string | null;
  status: "pendiente" | "comprado";
  paid: boolean | null;
  is_estimated: boolean;
  purchase_date: string | null;
  bought_by: string | null;
  notes: string | null;
  created_at: string;
};

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  evento_presencial_masterclass: "Eventos presenciales (masterclass)",
  evento_virtual: "Eventos virtuales",
  otro: "Otros",
};

export const DEFAULT_ITEM_CATEGORIES = [
  "Papelería y materiales",
  "Coffee break y actividades",
  "Decoración",
  "Regalos y kits",
  "Logística y transporte",
  "Telefonía y soporte",
  "Otro",
];

/** Qué datos le faltan a una compra (para marcarla como incompleta). */
export function missingFields(i: InventoryItem): string[] {
  const missing: string[] = [];
  if (i.quantity == null) missing.push("cantidad");
  if (i.total_cents == null) missing.push("precio");
  if (!i.store) missing.push("tienda");
  if (i.status === "comprado" && !i.purchase_date) missing.push("fecha");
  if (i.status === "comprado" && i.paid == null) missing.push("pago");
  return missing;
}

/** Precio unitario mostrado: el guardado o total ÷ cantidad. */
export function unitCents(i: InventoryItem): number | null {
  if (i.unit_cost_cents != null) return Number(i.unit_cost_cents);
  if (i.total_cents != null && i.quantity) return Math.round(Number(i.total_cents) / Number(i.quantity));
  return null;
}

/**
 * Completa total o unitario con lo que se sepa:
 * total = cantidad × unitario, o unitario = total ÷ cantidad.
 */
export function resolvePrices(quantity: number | null, unitCents: number | null, totalCents: number | null) {
  let unit = unitCents;
  let total = totalCents;
  if (total == null && quantity != null && unit != null) total = Math.round(quantity * unit);
  if (unit == null && quantity && total != null) unit = Math.round(total / quantity);
  return { unit, total };
}
