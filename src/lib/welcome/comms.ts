import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Dos tipos de comunicación:
//  - "operativo": lo que la alumna necesita por su compra (bienvenida,
//    acceso, calendario, recordatorios de vencimiento). Siempre se envía.
//  - "marketing": promociones y lanzamientos. SOLO con consentimiento
//    (marketing_opt_in = true). Por defecto, no.
export type CommCategory = "operativo" | "marketing";

/**
 * Reserva el envío de un correo. Devuelve true solo la PRIMERA vez para
 * esa dedupe_key: si Wompi repite el aviso de pago (o llegan dos a la vez),
 * el segundo intento recibe false y no envía nada.
 */
export async function claimEmail(params: { dedupeKey: string; email: string; kind: string; category: CommCategory }) {
  const admin = createAdminClient();
  const { error } = await admin.from("email_log").insert({
    dedupe_key: params.dedupeKey,
    email: params.email.trim().toLowerCase(),
    kind: params.kind,
    category: params.category,
  });
  if (!error) return true;
  // 23505 = clave duplicada: ese correo ya se envió (o se está enviando).
  if (error.code === "23505") return false;
  // Cualquier otro problema con el registro no debe dejar a la alumna
  // sin su correo: se envía igual y se deja constancia en el log.
  console.error("[email_log] no se pudo registrar el envío:", error.message);
  return true;
}

export async function finishEmail(dedupeKey: string, ok: boolean) {
  const admin = createAdminClient();
  if (ok) {
    await admin.from("email_log").update({ status: "enviado" }).eq("dedupe_key", dedupeKey);
  } else {
    // Si falló el envío, se libera la reserva para que un reintento de
    // Wompi pueda volver a intentarlo.
    await admin.from("email_log").delete().eq("dedupe_key", dedupeKey);
  }
}

/** Crea (si no existe) la fila de preferencias y devuelve su token de gestión. */
export async function ensurePreferences(email: string, marketingOptIn?: boolean, source?: string) {
  const admin = createAdminClient();
  const e = email.trim().toLowerCase();
  const { data: existing } = await admin
    .from("communication_preferences")
    .select("manage_token, marketing_opt_in")
    .eq("email", e)
    .maybeSingle();
  if (existing) {
    // Solo se ACTIVA el consentimiento si la persona lo marcó; nunca se
    // desactiva aquí algo que ella activó antes.
    if (marketingOptIn && !existing.marketing_opt_in) {
      await admin
        .from("communication_preferences")
        .update({ marketing_opt_in: true, consent_source: source ?? null, updated_at: new Date().toISOString() })
        .eq("email", e);
    }
    return existing.manage_token as string;
  }
  const { data } = await admin
    .from("communication_preferences")
    .insert({ email: e, marketing_opt_in: !!marketingOptIn, consent_source: marketingOptIn ? (source ?? null) : null })
    .select("manage_token")
    .single();
  return (data?.manage_token as string) ?? null;
}

/** ¿Se le puede enviar marketing a este correo? (por defecto, no) */
export async function canSendMarketing(email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("communication_preferences")
    .select("marketing_opt_in")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data?.marketing_opt_in === true;
}
