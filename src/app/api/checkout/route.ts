import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { productId } = await req.json();
  if (typeof productId !== "string") {
    return NextResponse.json({ error: "Falta el producto." }, { status: 400 });
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
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    buyer_id: user.id,
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
