// src/app/api/metodologia-poderosa/[moduleId]/playback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedPlaybackUrl } from "@/lib/bunny/stream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("category_modules")
    .select("id, bunny_video_id, is_published")
    .eq("id", moduleId)
    .maybeSingle();

  if (!module || !module.bunny_video_id) {
    return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
  }

  // RLS en category_modules ya exige is_published + acceso al producto (o ser la dueña),
  // así que si la fila se pudo leer, el acceso es válido. Si no se pudo leer, el select
  // anterior devuelve null por la política, y ya respondimos 404 arriba.

  return NextResponse.json({ url: getSignedPlaybackUrl(module.bunny_video_id) });
}
