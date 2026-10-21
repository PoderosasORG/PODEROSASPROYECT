import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const ticketId = (await req.json().catch(() => null))?.ticketId;
  if (typeof ticketId !== "string") {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("event_tickets")
    .select("id, checked_in_at, orders(buyer_name, buyer_email)")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Esta boleta no existe." }, { status: 404 });
  }

  const order = Array.isArray(ticket.orders) ? ticket.orders[0] : ticket.orders;

  if (ticket.checked_in_at) {
    return NextResponse.json(
      {
        error: "Esta boleta ya fue usada.",
        buyerName: order?.buyer_name ?? null,
        checkedInAt: ticket.checked_in_at,
      },
      { status: 409 },
    );
  }

  await admin
    .from("event_tickets")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", ticketId);

  return NextResponse.json({
    ok: true,
    buyerName: order?.buyer_name ?? null,
    buyerEmail: order?.buyer_email ?? null,
  });
}
