import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Estados de la alumna en la Metodología. Cada uno se marca UNA vez
// (la primera), así que llamar estas funciones varias veces es seguro.
export type JourneyStep =
  | "purchase_confirmed_at"
  | "account_activated_at"
  | "first_login_at"
  | "first_module_started_at"
  | "first_activity_completed_at";

/** Registra a la alumna (si no existe) con la compra confirmada. */
export async function registerStudent(params: {
  productId: string;
  email: string;
  userId: string | null;
  fullName: string | null;
  orderId: string;
  accountActive: boolean;
}) {
  const admin = createAdminClient();
  const email = params.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("student_journey")
    .select("email, user_id, account_activated_at")
    .eq("product_id", params.productId)
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    await admin.from("student_journey").insert({
      product_id: params.productId,
      email,
      user_id: params.userId,
      full_name: params.fullName,
      order_id: params.orderId,
      purchase_confirmed_at: now,
      account_activated_at: params.accountActive ? now : null,
    });
    return;
  }
  // Recompra o renovación: completa lo que falte sin borrar fechas previas.
  await admin
    .from("student_journey")
    .update({
      user_id: existing.user_id ?? params.userId,
      order_id: params.orderId,
      ...(params.accountActive && !existing.account_activated_at ? { account_activated_at: now } : {}),
    })
    .eq("product_id", params.productId)
    .eq("email", email);
}

/**
 * Marca un estado para la alumna (por usuario o por correo) si todavía
 * no estaba marcado. No falla si la alumna no está registrada.
 */
export async function markStep(
  step: JourneyStep,
  who: { productId: string; userId?: string | null; email?: string | null },
) {
  try {
    const admin = createAdminClient();
    let query = admin
      .from("student_journey")
      .update({ [step]: new Date().toISOString(), ...(who.userId ? { user_id: who.userId } : {}) })
      .eq("product_id", who.productId)
      .is(step, null);
    if (who.email) query = query.eq("email", who.email.trim().toLowerCase());
    else if (who.userId) query = query.eq("user_id", who.userId);
    else return;
    await query;
  } catch (err) {
    console.error(`[journey] no se pudo marcar ${step}:`, err);
  }
}
