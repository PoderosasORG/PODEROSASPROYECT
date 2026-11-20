import { estimateWompiFeeCents } from "@/lib/admin/wompiFee";

type Obj = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null;
}

function obj(v: unknown): Obj {
  return v && typeof v === "object" ? (v as Obj) : {};
}

/** "+57" + "3001234567" → "+57 3001234567" (sin duplicar el indicativo). */
export function joinPhone(prefix: string | null, phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (!prefix) return digits;
  const p = prefix.startsWith("+") ? prefix : `+${prefix}`;
  return `${p} ${digits}`;
}

/**
 * Datos de la transacción de Wompi que sirven para el CRM y finanzas.
 * Wompi manda customer_data (nombre, teléfono) y, si el checkout pidió
 * dirección (collect-shipping), shipping_address. Todo es opcional:
 * lo que no venga queda en null.
 */
export function wompiCrmFields(transaction: unknown, amountCents: number) {
  const t = obj(transaction);
  const customer = obj(t.customer_data);
  const shipping = obj(t.shipping_address);

  const phone =
    joinPhone(str(customer.phone_number_prefix), str(customer.phone_number)) ??
    joinPhone(str(shipping.phone_number_prefix), str(shipping.phone_number));

  const address = [str(shipping.address_line_1), str(shipping.address_line_2)].filter(Boolean).join(", ") || null;

  const fields: Record<string, string | number | null> = {
    wompi_payment_method: str(t.payment_method_type),
    wompi_fee_cents: estimateWompiFeeCents(amountCents),
  };
  if (phone) fields.buyer_phone = phone;
  if (address) fields.buyer_address = address;
  if (str(shipping.city)) fields.buyer_city = str(shipping.city);
  if (str(shipping.region)) fields.buyer_region = str(shipping.region);
  if (str(shipping.country)) fields.buyer_country = str(shipping.country);
  return fields;
}
