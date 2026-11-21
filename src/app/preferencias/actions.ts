"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensurePreferences } from "@/lib/welcome/comms";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Cambia el consentimiento de marketing. Se identifica a la persona por
 * el token del enlace de su correo, o por su sesión iniciada.
 */
export async function savePreferences(form: FormData) {
  const optIn = form.get("marketing") === "on";
  const token = String(form.get("t") ?? "");
  const admin = createAdminClient();

  let email: string | null = null;
  if (UUID_RE.test(token)) {
    const { data } = await admin.from("communication_preferences").select("email").eq("manage_token", token).maybeSingle();
    email = data?.email ?? null;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      email = user.email.toLowerCase();
      await ensurePreferences(email);
    }
  }
  if (!email) redirect("/preferencias?error=1");

  await admin
    .from("communication_preferences")
    .update({
      marketing_opt_in: optIn,
      consent_source: optIn ? "preferencias" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  revalidatePath("/preferencias");
  redirect(`/preferencias?${UUID_RE.test(token) ? `t=${token}&` : ""}ok=1`);
}
