import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markStep } from "@/lib/welcome/journey";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";

// La alumna acaba de crear/cambiar su contraseña: su cuenta queda activada.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });
  await markStep("account_activated_at", { productId: METODOLOGIA_PODEROSAS_PRODUCT_ID, email: user.email, userId: user.id });
  return NextResponse.json({ ok: true });
}
