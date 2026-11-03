import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Igual que /api/metodologia-poderosa/files/[fileId]/download, pero para
// product_files en general (bonos del curso, ebooks, plantillas). Un link
// directo a nuestro propio dominio, sin window.open ni fetch intermedio:
// window.open() después de esperar una respuesta del servidor lo bloquean
// los navegadores (sobre todo en celular) por no ser un clic directo.
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();

  // RLS de product_files (product_files_select_with_access) ya exige
  // has_access_to_product(product_id): si esta fila se puede leer con la
  // sesión del usuario, el acceso es válido.
  const { data: file } = await supabase
    .from("product_files")
    .select("file_path, file_name, display_name")
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

  const downloadName = file.display_name || file.file_name;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    },
  });
}
