import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compra de boleta de evento SIN cuenta: a diferencia de /api/checkout,
// aquí no hay sesión de Supabase. La orden se crea con el service role
// (admin), guardando nombre/correo directo en vez de un buyer_id.
export async function POST(req: NextRequest) {
  // Sin esto, un script podía crear órdenes "pending" sin límite — no
  // roba dinero (Wompi sigue siendo la fuente de verdad del pago), pero
  // podía inflar la tabla de órdenes y, si hay cupo limitado, acaparar
  // cupos con órdenes que nunca se pagan.
  const { limited, retryAfter } = await checkRateLimit(req, "checkout-evento", {
    limit: 8,
    windowSeconds: 60,
  });
  if (limited) return rateLimitResponse(retryAfter!);

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  const buyerName = typeof body?.buyerName === "string" ? body.buyerName.trim() : "";
  const buyerEmail = typeof body?.buyerEmail === "string" ? body.buyerEmail.trim().toLowerCase() : "";

  if (typeof productId !== "string" || !buyerName || !EMAIL_RE.test(buyerEmail)) {
    return NextResponse.json({ error: "Falta nombre, correo o evento válidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, creator_id, price_cents, currency, capacity")
    .eq("id", productId)
    .eq("type", "event")
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  if (product.capacity != null) {
    const { count } = await admin
      .from("event_tickets")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);

    if ((count ?? 0) >= product.capacity) {
      return NextResponse.json({ error: "Ya no hay cupos disponibles para este evento." }, { status: 400 });
    }
  }

  const { data: creator } = await admin
    .from("creators")
    .select("id, wompi_public_key")
    .eq("id", product.creator_id)
    .maybeSingle();

  if (!creator?.wompi_public_key) {
    return NextResponse.json({ error: "Los pagos de este evento aún no están configurados." }, { status: 400 });
  }

  const { data: secretRow } = await admin
    .from("creator_payment_secrets")
    .select("wompi_integrity_secret")
    .eq("creator_id", creator.id)
    .maybeSingle();

  if (!secretRow) {
    return NextResponse.json({ error: "Falta configurar la llave de integridad de Wompi." }, { status: 400 });
  }

  const orderId = crypto.randomUUID();
  const { error: orderError } = await admin.from("orders").insert({
    id: orderId,
    buyer_id: null,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    product_id: product.id,
    creator_id: creator.id,
    amount_cents: product.price_cents,
    currency: product.currency,
    status: "pending",
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const reference = orderId;
  const signatureString = `${reference}${product.price_cents}${product.currency}${secretRow.wompi_integrity_secret}`;
  const signature = crypto.createHash("sha256").update(signatureString).digest("hex");

  const params = new URLSearchParams({
    "public-key": creator.wompi_public_key,
    currency: product.currency,
    "amount-in-cents": String(product.price_cents),
    reference,
    "signature:integrity": signature,
  });

  const origin = req.nextUrl.origin;
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  if (!isLocal) {
    params.set("redirect-url", `${origin}/pago/confirmacion?order=${orderId}`);
  }

  return NextResponse.json({ checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}` });
}
