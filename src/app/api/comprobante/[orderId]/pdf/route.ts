import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

// A diferencia de la boleta del evento (QR público), el comprobante
// tiene datos de la venta — solo la creadora dueña de esa orden puede
// descargarlo, nunca por el solo hecho de conocer el id de la orden.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, creator_id, buyer_name, buyer_email, amount_cents, currency, created_at, products(title)")
    .eq("id", orderId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
  }

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const pdfBytes = await generateReceiptPdf({
    orderId: order.id,
    buyerName: order.buyer_name ?? "",
    buyerEmail: order.buyer_email ?? "",
    productTitle: product?.title ?? "—",
    amountCents: order.amount_cents,
    currency: order.currency,
    paidAt: new Date(order.created_at),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="comprobante-${order.id}.pdf"`,
    },
  });
}
