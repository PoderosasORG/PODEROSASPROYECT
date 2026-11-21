import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { normalizePhone, upsertLead } from "@/lib/sales/leads";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Quiero orientación": la persona deja su nombre y celular y AUTORIZA
// que le escriban por WhatsApp. Sin esa casilla no se guarda nada.
export async function POST(req: NextRequest) {
  const { limited, retryAfter } = await checkRateLimit(req, "orientacion", { limit: 5, windowSeconds: 60 });
  if (limited) return rateLimitResponse(retryAfter!);

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : null);
  const email = typeof body?.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim().toLowerCase() : null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : null;
  const consent = body?.consent === true;

  if (!name || !phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Escribe tu nombre y un celular válido." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Necesitamos tu autorización para escribirte por WhatsApp." }, { status: 400 });
  }

  try {
    await upsertLead({
      email,
      phone,
      fullName: name,
      source: "orientacion_web",
      status: "solicito_info",
      whatsappConsent: true,
      consentSource: "formulario_orientacion",
      question,
    });
  } catch (err) {
    console.error("[orientacion]", err);
  }

  const team = process.env.ORIENTATION_WHATSAPP_NUMBER?.replace(/\D/g, "");
  const text = `Hola, soy ${name}. Quiero orientación sobre la Metodología PODEROSAS 2026–2027.${question ? ` Mi duda: ${question}` : ""}`;
  return NextResponse.json({ ok: true, whatsappUrl: team ? `https://wa.me/${team}?text=${encodeURIComponent(text)}` : null });
}
