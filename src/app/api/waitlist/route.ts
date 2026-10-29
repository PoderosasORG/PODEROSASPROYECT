import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lista de espera (sin cobro): solo guarda el correo de quien quiere
// que le avisen cuando un producto (ej. el curso virtual) esté listo.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body?.source === "string" ? body.source.trim() : "general";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("waitlist_signups")
    .insert({ email, source })
    .select()
    .single();

  // Si ya estaba en la lista (correo duplicado para esa fuente), no es
  // un error para quien lo está pidiendo — solo confirmamos igual.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "No se pudo guardar, intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
