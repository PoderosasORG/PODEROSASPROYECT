import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketEmail } from "@/lib/sendTicketEmail";

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
    .select("id, creator_id, product_id, buyer_name, buyer_email, status, products(type, title)")
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

  // Solo generamos la boleta la primera vez que la orden queda aprobada
  // (Wompi puede reenviar el mismo evento más de una vez).
  if (newStatus === "approved" && !wasAlreadyApproved && product?.type === "event" && order.buyer_email) {
    const { data: ticket } = await admin
      .from("event_tickets")
      .insert({ order_id: order.id, product_id: order.product_id })
      .select("id")
      .single();

    if (ticket) {
      try {
        await sendTicketEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          eventTitle: product.title,
          ticketId: ticket.id,
        });
      } catch (err) {
        // No tumbamos el webhook por un fallo de correo: la boleta ya
        // quedó creada en la base de datos y se puede reenviar a mano.
        console.error("No se pudo enviar el correo de la boleta:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
