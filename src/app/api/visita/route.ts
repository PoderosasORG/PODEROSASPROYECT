import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORIGIN_COOKIE, VISITOR_COOKIE } from "@/lib/origin";

const PAGES = new Set(["home", "metodologia"]);
const UUID_RE = /^[0-9a-f-]{36}$/i;

// Cuenta una visita anónima a la landing (sin nombre, correo ni IP).
export async function POST(req: NextRequest) {
  const visitor = req.cookies.get(VISITOR_COOKIE)?.value;
  const body = await req.json().catch(() => null);
  const page = typeof body?.page === "string" && PAGES.has(body.page) ? body.page : null;
  if (!visitor || !UUID_RE.test(visitor) || !page) return NextResponse.json({ ok: false });

  try {
    await createAdminClient().rpc("track_landing_visit", {
      p_visitor: visitor,
      p_page: page,
      p_origin: req.cookies.get(ORIGIN_COOKIE)?.value ?? "Directo",
    });
  } catch {
    // Nunca afecta a quien visita la página.
  }
  return NextResponse.json({ ok: true });
}
