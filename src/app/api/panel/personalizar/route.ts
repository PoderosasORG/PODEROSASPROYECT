import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PanelData } from "@/components/panel/FixedPanelEditor";

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const data: PanelData | undefined = body?.data;
  if (!data) {
    return NextResponse.json({ error: "Falta data." }, { status: 400 });
  }

  // RLS (creators_update_own) ya garantiza que solo puede actualizar su propia fila.
  const { error } = await supabase
    .from("creators")
    .update({
      avatar_url: data.avatar.url,
      avatar_focus_x: data.avatar.focusX,
      avatar_focus_y: data.avatar.focusY,
      cover_image_url: data.cover.url,
      cover_focus_x: data.cover.focusX,
      cover_focus_y: data.cover.focusY,
      bio: data.bio,
      bio_style: data.bioStyle,
      theme: data.theme,
      content_blocks: data.blocks,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
