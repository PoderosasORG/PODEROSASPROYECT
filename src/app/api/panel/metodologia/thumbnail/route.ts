import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setBunnyThumbnail } from "@/lib/bunny/stream";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { categoryId?: string; videoId?: string; thumbnailUrl?: string }
    | null;
  if (!body?.categoryId || !body?.videoId || !body?.thumbnailUrl) {
    return NextResponse.json({ error: "Falta categoryId, videoId o thumbnailUrl" }, { status: 400 });
  }

  const { data: category } = await supabase
    .from("course_categories")
    .select("id, owner_id")
    .eq("id", body.categoryId)
    .maybeSingle();

  if (!category || category.owner_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso sobre esta categoría" }, { status: 403 });
  }

  try {
    await setBunnyThumbnail(body.videoId, body.thumbnailUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo fijar la miniatura" },
      { status: 502 },
    );
  }
}
