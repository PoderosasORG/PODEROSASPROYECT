import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutos: alcanza para ver/descargar, no para compartir el link.

export async function POST(req: NextRequest) {
  // Frena un script que pida este link firmado en bucle (cada link nuevo
  // es una oportunidad más de compartirlo/descargarlo). Alguien viendo
  // varios módulos de un curso real nunca se acerca a este límite.
  const { limited, retryAfter } = await checkRateLimit(req, "signed-url", {
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return rateLimitResponse(retryAfter!);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const kind = body?.kind; // "lesson" | "file"
  const id = body?.id;
  if ((kind !== "lesson" && kind !== "file") || typeof id !== "string") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  // El acceso ya quedó validado por RLS: si la fila existe en una consulta
  // hecha con la SESIÓN del usuario (no el service role), es porque
  // has_access_to_product() la dejó pasar.
  const table = kind === "lesson" ? "course_lessons" : "product_files";
  const pathColumn = kind === "lesson" ? "video_url" : "file_path";

  const { data: row } = await supabase.from(table).select(`id, ${pathColumn}`).eq("id", id).maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "No tienes acceso a este contenido." }, { status: 403 });
  }

  const filePath = (row as Record<string, unknown>)[pathColumn] as string | null;
  if (!filePath) {
    return NextResponse.json({ error: "Este contenido no tiene archivo asociado." }, { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from("product-files")
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: "No se pudo generar el link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
