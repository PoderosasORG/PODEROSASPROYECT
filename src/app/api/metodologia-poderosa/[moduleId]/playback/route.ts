// src/app/api/metodologia-poderosa/[moduleId]/playback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedPlaybackUrl } from "@/lib/bunny/stream";
import { markStep } from "@/lib/welcome/journey";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";

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

  // Estado "primer módulo iniciado" (solo la primera vez).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await markStep("first_module_started_at", { productId: METODOLOGIA_PODEROSAS_PRODUCT_ID, userId: user.id, email: user.email });

  // no-store: el enlace firmado es personal y de corta duración; ningún
  // navegador ni proxy debe guardarlo para reutilizarlo.
  return NextResponse.json(
    { url: getSignedPlaybackUrl(module.bunny_video_id) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
