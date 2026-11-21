import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { nextInstallment, planByToken } from "@/lib/installments/plans";
import { buildWompiCheckoutUrl } from "@/lib/wompi/checkoutUrl";
import { saveAnalyticsIds } from "@/lib/analytics/server";
import { originFromCookie } from "@/lib/origin";

// Pago de la siguiente cuota desde el link privado del plan (/cuotas/<token>).
// El valor sale del calendario guardado en el plan, nunca del navegador.
export async function POST(req: NextRequest) {
  const { limited, retryAfter } = await checkRateLimit(req, "cuotas-pagar", { limit: 10, windowSeconds: 60 });
  if (limited) return rateLimitResponse(retryAfter!);

  const body = await req.json().catch(() => null);
  const plan = typeof body?.token === "string" ? await planByToken(body.token) : null;
  if (!plan) return NextResponse.json({ error: "No encontramos tu plan de cuotas." }, { status: 404 });

  const next = nextInstallment(plan);
  if (!next || plan.installments_paid === 0) {
    return NextResponse.json({ error: "Este plan no tiene cuotas pendientes." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Si ya hay un pago aprobado de esta cuota (el webhook aún no actualizó
  // el plan), no se cobra dos veces.
  const { data: already } = await admin
    .from("orders")
    .select("id")
    .eq("installment_plan_id", plan.id)
    .eq("installment_number", next.number)
    .eq("status", "approved")
    .limit(1);
  if (already && already.length > 0) {
    return NextResponse.json({ error: "Esta cuota ya está paga. En unos minutos se actualiza tu acceso." }, { status: 400 });
  }

  const { data: product } = await admin
    .from("products")
    .select("id, creator_id, currency, creators(wompi_public_key)")
    .eq("id", plan.product_id)
    .maybeSingle();
  const creator = product ? (Array.isArray(product.creators) ? product.creators[0] : product.creators) : null;
  if (!product || !creator?.wompi_public_key) {
    return NextResponse.json({ error: "Los pagos no están disponibles en este momento." }, { status: 400 });
  }

  const orderId = crypto.randomUUID();
  const { error } = await admin.from("orders").insert({
    id: orderId,
    buyer_id: plan.buyer_id,
    buyer_name: plan.buyer_name,
    buyer_email: plan.buyer_email,
    product_id: product.id,
    creator_id: product.creator_id,
    amount_cents: next.amountCents,
    currency: product.currency,
    status: "pending",
    origin: originFromCookie(req),
    installment_plan_id: plan.id,
    installment_number: next.number,
    installment_total: plan.installments_total,
  });
  if (error) return NextResponse.json({ error: "No se pudo iniciar el pago, intenta de nuevo." }, { status: 500 });

  await saveAnalyticsIds(req, orderId);

  const checkout = await buildWompiCheckoutUrl({
    creatorId: product.creator_id,
    publicKey: creator.wompi_public_key,
    reference: orderId,
    amountCents: next.amountCents,
    currency: product.currency,
    siteOrigin: req.nextUrl.origin,
  });
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });

  return NextResponse.json({ checkoutUrl: checkout.url, amountCents: next.amountCents, currency: product.currency });
}
