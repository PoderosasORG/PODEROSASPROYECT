"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";
import { redirect } from "next/navigation";
import { ensurePreferences } from "@/lib/welcome/comms";
import { loadCourseInfo } from "@/lib/welcome/courseInfo";
import { sendWelcomeEmail } from "@/lib/welcome/welcomeEmail";

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function addSession(form: FormData) {
  await requireAdmin();
  const title = text(form, "title");
  const date = text(form, "date");
  const time = text(form, "time") ?? "19:00";
  if (!title || !date) return;
  await createAdminClient()
    .from("live_sessions")
    .insert({
      product_id: METODOLOGIA_PODEROSAS_PRODUCT_ID,
      title,
      starts_at: new Date(`${date}T${time}:00-05:00`).toISOString(),
      notes: text(form, "notes"),
    });
  revalidatePath("/admin/alumnas");
}

export async function deleteSession(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  await createAdminClient().from("live_sessions").delete().eq("id", id);
  revalidatePath("/admin/alumnas");
}

/** Guarda quién asistió a un encuentro (lista completa de casillas). */
export async function saveAttendance(form: FormData) {
  await requireAdmin();
  const sessionId = text(form, "session_id");
  if (!sessionId) return;
  const emails = form.getAll("email").map((e) => String(e).toLowerCase());
  const admin = createAdminClient();
  await admin.from("live_session_attendance").delete().eq("session_id", sessionId);
  if (emails.length) {
    await admin.from("live_session_attendance").insert(emails.map((email) => ({ session_id: sessionId, email })));
  }
  revalidatePath("/admin/alumnas");
}

export async function setModuleDate(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  await createAdminClient()
    .from("category_modules")
    .update({ planned_publish_date: text(form, "date") })
    .eq("id", id);
  revalidatePath("/admin/alumnas");
}

/**
 * Envía el correo de bienvenida de PRUEBA a un correo (ej. Susy), con los
 * datos reales del curso. No cuenta como bienvenida enviada a una alumna.
 */
export async function sendTestWelcome(form: FormData) {
  await requireAdmin();
  const to = text(form, "email")?.toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) redirect("/admin/alumnas?prueba=error");
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("buyer_name, access_expires_at")
    .eq("product_id", METODOLOGIA_PODEROSAS_PRODUCT_ID)
    .eq("buyer_email", to)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const token = await ensurePreferences(to);
  const origin = "https://poderosas.org";
  let ok = true;
  try {
    await sendWelcomeEmail({
      to,
      subjectPrefix: "[Prueba] ",
      buyerName: order?.buyer_name ?? "",
      courseUrl: `${origin}/cursos/metodologia-poderosa`,
      loginUrl: `${origin}/login?next=/cursos/metodologia-poderosa`,
      accessUntil: order?.access_expires_at ?? null,
      whatsappUrl: process.env.WHATSAPP_COMMUNITY_URL || null,
      preferencesUrl: token ? `${origin}/preferencias?t=${token}` : null,
      info: await loadCourseInfo(METODOLOGIA_PODEROSAS_PRODUCT_ID),
    });
  } catch (err) {
    ok = false;
    console.error("[prueba bienvenida]", err);
  }
  redirect(`/admin/alumnas?prueba=${ok ? "ok" : "error"}`);
}
