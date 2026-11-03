import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// El descuento de lanzamiento aplica a las primeras 15 compras reales,
// algo distinto del aforo del lugar (product.capacity) — no se mezclan.
export const EVENT_DISCOUNT_SLOTS = 15;

// Cuenta real de boletas vendidas (órdenes aprobadas) del evento más
// reciente — nunca un número inventado. Se usa en la landing y en
// /evento para mostrar urgencia real en vez de prueba social falsa.
export async function getEventStats() {
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, capacity")
    .eq("type", "event")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!product) return null;

  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("status", "approved");

  return {
    sold: count ?? 0,
    capacity: product.capacity ?? null,
  };
}
