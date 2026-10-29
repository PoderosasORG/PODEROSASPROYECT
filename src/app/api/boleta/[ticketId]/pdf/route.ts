import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketPdf } from "@/lib/generateTicketPdf";

// El id de la boleta ya es el mismo valor codificado en el QR (lo que
// se escanea en la puerta) — acceder al PDF con ese mismo id no abre
// más información de la que ya tiene quien recibió el correo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("event_tickets")
    .select("id, orders(buyer_name)")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Entrada no encontrada." }, { status: 404 });
  }

  const order = Array.isArray(ticket.orders) ? ticket.orders[0] : ticket.orders;
  const pdfBytes = await generateTicketPdf({
    buyerName: order?.buyer_name ?? "",
    ticketId: ticket.id,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="entrada-poderosas.pdf"`,
    },
  });
}
