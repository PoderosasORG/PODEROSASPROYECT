import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Wompi llama esta URL directamente desde sus servidores (no desde
// el navegador del comprador), así que es la fuente de verdad real
// del estado del pago — funciona aunque el comprador cierre la
// pestaña antes de volver a /pago/confirmacion.
// Configúrala en Wompi → Desarrolladores → Eventos como:
//   https://tu-dominio.com/api/webhooks/wompi

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const transaction = payload?.data?.transaction;
  const reference: string | undefined = transaction?.reference;
  const properties: string[] = payload?.signature?.properties ?? [];
  const checksum: string | undefined = payload?.signature?.checksum;
  const timestamp = payload?.timestamp;

  if (!reference || !checksum || properties.length === 0) {
    return NextResponse.json({ error: "malformed event" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, creator_id, buyer_id, status, products(id, type, billing_interval)")
    .eq("id", reference)
    .maybeSingle();

  if (!order) {
    // No es un error de Wompi: puede ser un evento de otra orden/entorno.
    return NextResponse.json({ ok: true });
  }

  const { data: secretRow } = await admin
    .from("creator_payment_secrets")
    .select("wompi_events_secret")
    .eq("creator_id", order.creator_id)
    .maybeSingle();

  if (!secretRow?.wompi_events_secret) {
    return NextResponse.json({ error: "missing events secret" }, { status: 400 });
  }

  const concatenated =
    properties.map((path) => String(getByPath(payload.data, path) ?? "")).join("") +
    String(timestamp) +
    secretRow.wompi_events_secret;
  const expectedChecksum = crypto.createHash("sha256").update(concatenated).digest("hex");

  if (expectedChecksum.toLowerCase() !== String(checksum).toLowerCase()) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const newStatus = String(transaction.status).toLowerCase();
  const wasAlreadyApproved = order.status === "approved";

  await admin
    .from("orders")
    .update({
      status: newStatus,
      wompi_transaction_id: transaction.id,
    })
    .eq("id", order.id);

  const product = Array.isArray(order.products) ? order.products[0] : order.products;

  // Al aprobarse una suscripción, activa/renueva la membresía. Es un
  // pago único por período (mes o año), no un cobro recurrente — Wompi
  // no ofrece eso, así que renovar significa "vuelve a pagar".
  if (newStatus === "approved" && !wasAlreadyApproved && product?.type === "membership" && order.buyer_id) {
    const months = product.billing_interval === "year" ? 12 : 1;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + months);

    await admin.from("memberships").upsert(
      {
        buyer_id: order.buyer_id,
        creator_id: order.creator_id,
        product_id: product.id,
        status: "active",
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "buyer_id,product_id" },
    );
  }

  return NextResponse.json({ ok: true });
}
