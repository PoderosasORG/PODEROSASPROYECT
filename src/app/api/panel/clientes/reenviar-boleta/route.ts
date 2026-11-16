import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketEmail } from "@/lib/sendTicketEmail";

// Reenvía manualmente el correo de la boleta de un pedido — para cuando
// una compradora dice que nunca le llegó el QR (spam, correo raro, un
// fallo puntual de envío). Solo la creadora dueña de ese pedido puede
// reenviarlo, nunca pedidos de otra.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticada" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId = body?.orderId;
  if (typeof orderId !== "string") {
    return NextResponse.json({ error: "Falta el pedido" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, creator_id, product_id, buyer_name, buyer_email, status, products(type)")
    .eq("id", orderId)
    .maybeSingle();

  const product = Array.isArray(order?.products) ? order.products[0] : order?.products;

  if (!order || order.creator_id !== user.id || product?.type !== "event" || order.status !== "approved") {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (!order.buyer_email) {
    return NextResponse.json({ error: "Este pedido no tiene correo registrado" }, { status: 400 });
  }

  let { data: ticket } = await admin
    .from("event_tickets")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (!ticket) {
    const { data: created, error: createError } = await admin
      .from("event_tickets")
      .insert({ order_id: order.id, product_id: order.product_id })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: "No se pudo generar la boleta" }, { status: 500 });
    }
    ticket = created;
  }

  await sendTicketEmail({
    to: order.buyer_email,
    buyerName: order.buyer_name ?? "",
    ticketId: ticket.id,
    siteUrl: req.nextUrl.origin,
  });

  return NextResponse.json({ ok: true });
}
