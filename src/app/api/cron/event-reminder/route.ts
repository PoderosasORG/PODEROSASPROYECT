import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReminderEmail } from "@/lib/sendTicketEmail";

// Disparado por un Vercel Cron Job (ver vercel.json) el 20 de noviembre a
// mediodía Bogotá — el día antes del evento. Corre en el servidor de
// Vercel, sin depender de que nadie tenga ninguna app abierta ni se
// acuerde de hacerlo a mano. Protegido con CRON_SECRET: Vercel manda ese
// secreto como header de autorización al llamarlo; cualquier otra
// llamada sin ese secreto se rechaza.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // vercel.json programa esto para el 20 de noviembre, pero el patrón de
  // cron no distingue el año — sin esto, se repetiría cada 20 de
  // noviembre de cualquier año futuro si alguien olvida borrar el cron.
  if (new Date().getUTCFullYear() !== 2026) {
    return NextResponse.json({ ok: true, skipped: "Solo aplica para el evento de 2026" });
  }

  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("id, product_id, buyer_name, buyer_email, buyer_id, products!inner(type)")
    .eq("status", "approved")
    .eq("products.type", "event");

  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: [] });
  }

  const buyerIds = [...new Set(orders.map((o) => o.buyer_id).filter((id): id is string => !!id))];
  const { data: profiles } = buyerIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", buyerIds)
    : { data: [] };
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const orderIds = orders.map((o) => o.id);
  const { data: existingTickets } = await admin.from("event_tickets").select("id, order_id").in("order_id", orderIds);
  const ticketByOrder = new Map((existingTickets ?? []).map((t) => [t.order_id, t.id]));

  const failed: { email: string; error: string }[] = [];
  let sent = 0;

  for (const order of orders) {
    const email = order.buyer_email;
    if (!email) continue;

    try {
      let ticketId = ticketByOrder.get(order.id);
      if (!ticketId) {
        const { data: created, error: createError } = await admin
          .from("event_tickets")
          .insert({ order_id: order.id, product_id: order.product_id })
          .select("id")
          .single();
        if (createError || !created) throw new Error(createError?.message ?? "No se pudo crear la boleta");
        ticketId = created.id;
      }

      const buyerName = order.buyer_name ?? (order.buyer_id ? profileNames.get(order.buyer_id) : null) ?? "";

      await sendTicketReminderEmail({
        to: email,
        buyerName,
        ticketId,
        siteUrl: req.nextUrl.origin,
      });
      sent++;
    } catch (err) {
      failed.push({ email, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
