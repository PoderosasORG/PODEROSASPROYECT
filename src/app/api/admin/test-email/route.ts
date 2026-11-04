// src/app/api/admin/test-email/route.ts
// TEMPORAL — solo para probar que Resend manda correos reales con la
// RESEND_API_KEY nueva, sin tener que hacer una compra de verdad por
// Wompi. Se borra apenas se confirme que funciona.
import { NextRequest, NextResponse } from "next/server";
import { sendTicketEmail } from "@/lib/sendTicketEmail";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Falta ?to=correo@ejemplo.com" }, { status: 400 });
  }

  try {
    await sendTicketEmail({
      to,
      buyerName: "Prueba",
      ticketId: "00000000-0000-0000-0000-000000000000",
      siteUrl: req.nextUrl.origin,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
