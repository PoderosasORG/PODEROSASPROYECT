import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Abre la factura de un gasto con un link firmado de 5 minutos.
// El bucket "facturas" es privado: sin este paso nadie puede verlas.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: member } = await supabase.from("admin_members").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: expense } = await admin.from("admin_expenses").select("invoice_path").eq("id", id).maybeSingle();
  if (!expense?.invoice_path) return NextResponse.json({ error: "Sin factura" }, { status: 404 });

  const { data } = await admin.storage.from("facturas").createSignedUrl(expense.invoice_path, 300);
  if (!data?.signedUrl) return NextResponse.json({ error: "No se pudo abrir la factura" }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
