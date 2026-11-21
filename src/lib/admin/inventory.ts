export type InventoryItem = {
  id: string;
  category: string;
  event_name: string;
  event_product_id: string | null;
  /** producto = artículo físico; servicio = servicio contratado. */
  kind: "producto" | "servicio";
  item_category: string | null;
  item: string;
  quantity: number | null;
  /** Unidades utilizadas en el evento (vacío = por registrar). */
  quantity_used: number | null;
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

// Categorías acordadas con Kat el 2026-11-20.
export const DEFAULT_ITEM_CATEGORIES = [
  "Papelería y materiales",
  "Decoración y regalos",
  "Insumos para actividades",
  "Alimentos y bebidas",
  "Servicios contratados",
  "Telefonía y soporte",
];

/** Qué datos le faltan a una compra (para marcarla como incompleta). */
export function missingFields(i: InventoryItem): string[] {
  const missing: string[] = [];
  // Un servicio contratado no tiene cantidad de unidades.
  if (i.quantity == null && i.kind !== "servicio") missing.push("cantidad");
  if (i.status === "comprado" && !i.bought_by) missing.push("responsable");
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

/** Sobrantes = compradas − utilizadas (null si falta alguno de los dos). */
export function leftover(i: InventoryItem): number | null {
  if (i.quantity == null || i.quantity_used == null) return null;
  return Math.max(0, Number(i.quantity) - Number(i.quantity_used));
}

export type InventoryChange = {
  id: number;
  item_id: string;
  action: "editado" | "eliminado";
  changes: Record<string, { antes: unknown; despues: unknown }>;
  changed_by: string | null;
  changed_at: string;
};

export const FIELD_LABELS: Record<string, string> = {
  item: "Producto",
  kind: "Tipo",
  item_category: "Categoría",
  quantity: "Cantidad",
  quantity_used: "Utilizadas",
  unit_cost_cents: "Valor unitario",
  total_cents: "Valor total",
  store: "Tienda",
  status: "Estado",
  paid: "Pago",
  is_estimated: "Estimado",
  purchase_date: "Fecha",
  bought_by: "Quién lo compró",
  notes: "Notas",
};

/** Valor legible para el historial. */
export function displayValue(field: string, v: unknown): string {
  if (v == null || v === "") return "vacío";
  if (field.endsWith("_cents")) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v) / 100);
  }
  if (field === "paid") return v === true ? "pagado" : v === false ? "falta pagar" : "por confirmar";
  if (field === "is_estimated") return v ? "sí" : "no";
  return String(v);
}
