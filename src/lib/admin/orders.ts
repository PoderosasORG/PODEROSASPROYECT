import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateWompiFeeCents } from "@/lib/admin/wompiFee";

export type AdminOrder = {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  payment_method: string | null;
  wompi_payment_method: string | null;
  wompi_fee_cents: number | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_address: string | null;
  buyer_city: string | null;
  buyer_region: string | null;
  buyer_country: string | null;
  origin: string | null;
  coupon_code: string | null;
  wompi_transaction_id: string | null;
  creator_id: string;
  product_id: string;
  product_title: string;
  product_type: string;
  creator_name: string;
  /** true = pagado directo a Nequi, no pasó por Wompi. */
  isDirect: boolean;
  /** true = orden de prueba creada a mano (no es venta real). */
  isTest: boolean;
  feeCents: number;
};

/**
 * Todas las órdenes aprobadas de la plataforma (todas las creadoras),
 * con producto y cuenta receptora. Usa la service role: SOLO se llama
 * después de requireAdmin().
 */
export async function loadApprovedOrders(opts: { fromIso?: string; toIsoExclusive?: string } = {}) {
  const admin = createAdminClient();
  let query = admin
    .from("orders")
    .select(
      "id, created_at, amount_cents, currency, payment_method, wompi_payment_method, wompi_fee_cents, buyer_id, buyer_name, buyer_email, buyer_phone, buyer_address, buyer_city, buyer_region, buyer_country, origin, coupon_code, wompi_transaction_id, creator_id, product_id, products!product_id(title, type)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (opts.fromIso) query = query.gte("created_at", opts.fromIso);
  if (opts.toIsoExclusive) query = query.lt("created_at", opts.toIsoExclusive);

  const [{ data: orders, error }, { data: creators }] = await Promise.all([
    query,
    admin.from("creators").select("id, display_name"),
  ]);
  if (error) throw new Error(`No se pudieron leer las órdenes: ${error.message}`);

  const creatorNames = new Map((creators ?? []).map((c) => [c.id, c.display_name as string]));

  // Nombre de quien compró con cuenta: vive en profiles, no en la orden.
  const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id).filter((x): x is string => !!x))];
  const { data: profiles } = buyerIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", buyerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (orders ?? []).map((o): AdminOrder => {
    const product = Array.isArray(o.products) ? o.products[0] : o.products;
    const isDirect = o.payment_method === "nequi_directo";
    const isTest = typeof o.wompi_transaction_id === "string" && o.wompi_transaction_id.startsWith("PRUEBA");
    const feeCents = isDirect || isTest ? 0 : (o.wompi_fee_cents ?? estimateWompiFeeCents(o.amount_cents));
    return {
      ...o,
      buyer_name: o.buyer_name ?? (o.buyer_id ? (profileNames.get(o.buyer_id) ?? null) : null),
      product_title: product?.title ?? "—",
      product_type: product?.type ?? "—",
      creator_name: creatorNames.get(o.creator_id) ?? "—",
      isDirect,
      isTest,
      feeCents,
    } as AdminOrder;
  });
}
