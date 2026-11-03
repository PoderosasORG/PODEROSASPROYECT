import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Pasa el archivo por nuestro propio dominio (no un link a Supabase) para
// que la descarga funcione también en celular: Safari/Chrome móvil ignoran
// el atributo "download" de un <a> cuando apunta a otro dominio, así que un
// link directo a Supabase Storage termina navegando a él en vez de bajarlo.
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();

  // RLS de category_module_files ya exige que el módulo esté publicado y el
  // usuario tenga acceso al producto (o sea la dueña de la categoría): si
  // esta fila se puede leer con la sesión del usuario, el acceso es válido.
  const { data: file } = await supabase
    .from("category_module_files")
    .select("file_path, file_name")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) {
    return NextResponse.json({ error: "No tienes acceso a este archivo." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("product-files").download(file.file_path);

  if (error || !blob) {
    return NextResponse.json({ error: "No se pudo descargar el archivo." }, { status: 500 });
  }

  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.file_name}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
    },
  });
}
