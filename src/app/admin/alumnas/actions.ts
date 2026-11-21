"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";

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
