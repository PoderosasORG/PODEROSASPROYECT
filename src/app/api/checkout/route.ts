import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  if (typeof productId !== "string") {
    return NextResponse.json({ error: "Falta el producto." }, { status: 400 });
  }

  // Sin sesión: igual que /api/checkout-evento, se compra con solo
  // nombre y correo (sin pedir cuenta primero). Al aprobarse el pago,
  // el webhook crea la cuenta automáticamente y manda el acceso por
  // correo — pedir login ANTES de pagar es la fricción que más tira
  // abajo la conversión en un checkout (Baymard Institute).
  let buyerName = "";
  let buyerEmail = "";
  if (!user) {
    const { limited, retryAfter } = await checkRateLimit(req, "checkout-guest", {
      limit: 8,
      windowSeconds: 60,
    });
    if (limited) return rateLimitResponse(retryAfter!);

    buyerName = typeof body?.buyerName === "string" ? body.buyerName.trim() : "";
    buyerEmail = typeof body?.buyerEmail === "string" ? body.buyerEmail.trim().toLowerCase() : "";

    if (!buyerName || !EMAIL_RE.test(buyerEmail)) {
      return NextResponse.json({ error: "guest_info_required" }, { status: 401 });
    }
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, price_cents, currency, is_published")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id, wompi_public_key")
    .eq("id", product.creator_id)
    .maybeSingle();

  if (!creator?.wompi_public_key) {
    return NextResponse.json(
      { error: "Esta creadora todavía no tiene los pagos configurados." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: secretRow } = await admin
    .from("creator_payment_secrets")
    .select("wompi_integrity_secret")
    .eq("creator_id", creator.id)
    .maybeSingle();

  if (!secretRow) {
    return NextResponse.json(
      { error: "Falta configurar la llave de integridad de Wompi para esta creadora." },
      { status: 400 },
    );
  }

  const orderId = crypto.randomUUID();
  // Logueado: inserta con el cliente del usuario (RLS exige
  // auth.uid() = buyer_id). Invitado: sin sesión no hay auth.uid(), así
  // que se inserta con el cliente admin, igual que /api/checkout-evento.
  const orderClient = user ? supabase : admin;
  const { error: orderError } = await orderClient.from("orders").insert({
    id: orderId,
    buyer_id: user?.id ?? null,
    buyer_name: user ? null : buyerName,
    buyer_email: user ? (user.email ?? null) : buyerEmail,
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

  // El CDN de Wompi rechaza (403) checkouts cuyo redirect-url apunta a
  // localhost. En desarrollo local lo omitimos: Wompi mostrará su propia
  // pantalla de resultado y el webhook (una vez el sitio esté en un
  // dominio real) seguirá siendo la fuente de verdad del estado.
  const origin = req.nextUrl.origin;
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  if (!isLocal) {
    params.set("redirect-url", `${origin}/pago/confirmacion?order=${orderId}`);
  }

  return NextResponse.json({ checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}` });
}
