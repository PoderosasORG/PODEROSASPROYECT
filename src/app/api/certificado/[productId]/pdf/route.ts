import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";

// El certificado NUNCA se entrega solo por haber comprado — hay que
// haber completado (module_progress) todos los módulos publicados del
// curso. Se recalcula en cada descarga, no se "emite" una sola vez, así
// que si se publica un módulo nuevo más adelante, el certificado deja
// de estar disponible hasta completarlo también.
export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: hasAccess } = await supabase.rpc("has_access_to_product", { p_product_id: productId });
  if (!hasAccess) {
    return NextResponse.json({ error: "No tienes acceso a este curso." }, { status: 403 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("title")
    .eq("id", productId)
    .maybeSingle();

  const { data: categories } = await supabase
    .from("course_categories")
    .select("id")
    .eq("product_id", productId);

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: modules } = categoryIds.length
    ? await supabase
        .from("category_modules")
        .select("id")
        .in("category_id", categoryIds)
        .eq("is_published", true)
    : { data: [] };

  const moduleIds = (modules ?? []).map((m) => m.id);
  if (moduleIds.length === 0) {
    return NextResponse.json({ error: "Este curso todavía no tiene módulos publicados." }, { status: 404 });
  }

  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id, completed_at")
    .eq("user_id", user.id)
    .in("module_id", moduleIds);

  const completedIds = new Set((progress ?? []).map((p) => p.module_id));
  const allCompleted = moduleIds.every((id) => completedIds.has(id));

  if (!allCompleted) {
    return NextResponse.json(
      { error: "Todavía te faltan módulos por completar para obtener tu certificado." },
      { status: 403 },
    );
  }

  const latestCompletedAt = (progress ?? [])
    .map((p) => new Date(p.completed_at).getTime())
    .reduce((max, t) => Math.max(max, t), 0);

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const pdfBytes = await generateCertificatePdf({
    buyerName: profile?.full_name ?? user.email ?? "",
    courseTitle: product?.title ?? "Metodología PODEROSAS",
    completedAt: latestCompletedAt ? new Date(latestCompletedAt) : new Date(),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-poderosas.pdf"`,
    },
  });
}
