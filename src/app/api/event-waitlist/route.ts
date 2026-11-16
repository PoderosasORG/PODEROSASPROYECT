import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Lista de espera de la PRÓXIMA edición del evento presencial (distinta
// de /api/waitlist, que es la lista de espera del curso virtual) — pide
// nombre y celular además del correo, y guarda en su propia tabla
// (event_waitlist).
export async function POST(req: NextRequest) {
  const { limited, retryAfter } = await checkRateLimit(req, "event-waitlist", {
    limit: 5,
    windowSeconds: 60,
  });
  if (limited) return rateLimitResponse(retryAfter!);

  const body = await req.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const consent = body?.consent === true;

  if (!fullName || !email || !phone) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Falta la autorización de datos" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("event_waitlist").insert({
    full_name: fullName,
    email,
    phone,
    consent,
  });

  // Correo repetido (misma persona se registró dos veces) no es un error
  // real para quien llena el formulario — se le confirma igual.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
