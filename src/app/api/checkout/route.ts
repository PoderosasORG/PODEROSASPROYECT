import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { effectivePriceCents } from "@/lib/metodologiaPoderosasLanzamiento";
import { originFromCookie } from "@/lib/origin";
import { saveAnalyticsIds } from "@/lib/analytics/server";
import { installmentConfigFor } from "@/lib/installments/config";
import { createPlan } from "@/lib/installments/plans";
import { buildWompiCheckoutUrl } from "@/lib/wompi/checkoutUrl";

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

  // Pago en cuotas: solo productos con plan configurado y con las
  // condiciones aceptadas (cada cuota habilita un tramo del acceso).
  const wantsInstallments = body?.plan === "cuotas";
  const installmentConfig = wantsInstallments ? installmentConfigFor(product.id) : null;
  if (wantsInstallments && !installmentConfig) {
    return NextResponse.json({ error: "Este producto no tiene pago en cuotas." }, { status: 400 });
  }
  if (installmentConfig && body?.acceptInstallmentTerms !== true) {
    return NextResponse.json({ error: "Debes aceptar las condiciones del pago en cuotas." }, { status: 400 });
  }

  // Metodología PODEROSAS tiene precio de lanzamiento por tiempo limitado
  // (ver metodologiaPoderosasLanzamiento.ts) — para cualquier otro producto,
  // esto devuelve product.price_cents sin cambios. Se calcula en el
  // servidor, con la hora del servidor: el contador que ve la compradora
  // es solo visual, nunca la fuente de verdad del precio.
  const priceCents = installmentConfig
    ? installmentConfig.installments[0].amountCents
    : effectivePriceCents(product.id, product.price_cents);

  let installmentFields = {};
  if (installmentConfig) {
    try {
      const plan = await createPlan({
        productId: product.id,
        email: user ? (user.email ?? "") : buyerEmail,
        name: user ? ((user.user_metadata?.full_name as string | undefined) ?? null) : buyerName,
        buyerId: user?.id ?? null,
        config: installmentConfig,
      });
      installmentFields = {
        installment_plan_id: plan.id,
        installment_number: 1,
        installment_total: installmentConfig.installments.length,
      };
    } catch (err) {
      console.error("[cuotas] no se pudo crear el plan:", err);
      return NextResponse.json({ error: "No se pudo iniciar el pago en cuotas, intenta de nuevo." }, { status: 500 });
    }
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
    amount_cents: priceCents,
    currency: product.currency,
    status: "pending",
    origin: originFromCookie(req),
    // Solo se escribe si lo marcó (consentimiento explícito, nunca por defecto).
    ...(body?.marketingOptIn === true ? { marketing_opt_in: true } : {}),
    ...installmentFields,
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Identificadores anónimos de GA4/Meta (cookies), para enviar la compra
  // desde el servidor sin datos personales. Nunca bloquea el checkout.
  await saveAnalyticsIds(req, orderId);

  const checkout = await buildWompiCheckoutUrl({
    creatorId: creator.id,
    publicKey: creator.wompi_public_key,
    reference: orderId,
    amountCents: priceCents,
    currency: product.currency,
    siteOrigin: req.nextUrl.origin,
  });
  if ("error" in checkout) {
    return NextResponse.json({ error: checkout.error }, { status: 400 });
  }

  return NextResponse.json({
    checkoutUrl: checkout.url,
    amountCents: priceCents,
    currency: product.currency,
  });
}
