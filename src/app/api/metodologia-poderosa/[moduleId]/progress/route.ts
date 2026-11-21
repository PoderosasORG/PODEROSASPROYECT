// src/app/api/metodologia-poderosa/[moduleId]/progress/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markStep } from "@/lib/welcome/journey";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";

// Marcar/desmarcar un módulo como visto. RLS en module_progress ya exige
// tener acceso al producto (comprado o membresía) para poder insertar —
// si la usuaria no tiene acceso, el insert falla y devolvemos 403.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { error } = await supabase
    .from("module_progress")
    .upsert({ user_id: user.id, module_id: moduleId }, { onConflict: "user_id,module_id" });

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar tu progreso." }, { status: 403 });
  }

  // Estado "primera actividad completada" (solo la primera vez).
  await markStep("first_activity_completed_at", { productId: METODOLOGIA_PODEROSAS_PRODUCT_ID, userId: user.id, email: user.email });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  await supabase
    .from("module_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("module_id", moduleId);

  return NextResponse.json({ ok: true });
}
