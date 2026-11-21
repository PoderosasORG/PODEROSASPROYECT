import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORIGIN_COOKIE, VISITOR_COOKIE } from "@/lib/origin";

const EVENTS = new Set(["cta_comprar", "cta_ir_a_metodologia"]);

// Registra un clic del embudo (anónimo: solo la cookie aleatoria y la fuente).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const event = typeof body?.event === "string" && EVENTS.has(body.event) ? body.event : null;
  if (!event) return NextResponse.json({ ok: false });
  const location = typeof body?.location === "string" ? body.location.slice(0, 80) : null;
  try {
    await createAdminClient().from("funnel_events").insert({
      event,
      location,
      visitor_id: req.cookies.get(VISITOR_COOKIE)?.value ?? null,
      origin: req.cookies.get(ORIGIN_COOKIE)?.value ?? "Directo",
    });
  } catch {
    // nunca afecta a quien navega
  }
  return NextResponse.json({ ok: true });
}
