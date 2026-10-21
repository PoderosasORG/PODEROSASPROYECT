import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("puckData" in body)) {
    return NextResponse.json({ error: "Falta puckData." }, { status: 400 });
  }

  // RLS (creators_update_own) ya garantiza que solo puede actualizar su propia fila.
  const { error } = await supabase
    .from("creators")
    .update({ puck_data: body.puckData })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
