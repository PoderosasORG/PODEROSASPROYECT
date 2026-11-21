"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_STATUSES, normalizePhone, type LeadStatus } from "@/lib/sales/leads";
import { WA_TEMPLATES, fillTemplate } from "@/lib/sales/templates";
import { WHATSAPP_UTM_LINK } from "@/lib/analytics/utm";
import { promoDeadlineLabel } from "@/lib/metodologiaPoderosasLanzamiento";

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function adminName(userId: string) {
  const { data } = await createAdminClient().from("creators").select("display_name").eq("id", userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? "Equipo";
}

/** Busca el contacto por correo o teléfono; si no existe, lo crea. */
async function findOrCreate(email: string | null, phone: string | null, fullName: string | null, source: string) {
  const admin = createAdminClient();
  const q = email
    ? admin.from("sales_leads").select("*").eq("email", email)
    : admin.from("sales_leads").select("*").eq("phone", phone!).is("email", null);
  const { data } = await q.maybeSingle();
  if (data) return data;
  const { data: created } = await admin
    .from("sales_leads")
    .insert({ email, phone, full_name: fullName, source })
    .select("*")
    .single();
  return created;
}

/** Guarda estado comercial, autorización de WhatsApp, teléfono y notas. */
export async function saveLead(form: FormData) {
  const { user } = await requireAdmin();
  const email = text(form, "email")?.toLowerCase() ?? null;
  const phone = normalizePhone(text(form, "phone"));
  if (!email && !phone) return;
  const lead = await findOrCreate(email, phone, text(form, "full_name"), text(form, "source") ?? "manual");
  if (!lead) return;

  const status = text(form, "status") as LeadStatus | null;
  const consent = form.get("whatsapp_consent") === "on";
  const now = new Date().toISOString();
  await createAdminClient()
    .from("sales_leads")
    .update({
      phone: phone ?? lead.phone,
      ...(status && LEAD_STATUSES.some((s) => s.key === status) ? { status } : {}),
      whatsapp_consent: consent,
      ...(consent && !lead.whatsapp_consent
        ? { consent_at: now, consent_source: `${text(form, "consent_how") ?? "registrado por el equipo"} (${await adminName(user.id)})` }
        : {}),
      ...(!consent ? { consent_at: null, consent_source: null } : {}),
      notes: text(form, "notes"),
      assigned_to: text(form, "assigned_to"),
      updated_at: now,
    })
    .eq("id", lead.id);
  revalidatePath("/admin/seguimiento");
}

/**
 * Abre WhatsApp con la plantilla elegida para UN contacto, solo si tiene
 * teléfono y autorizó que le escribamos. Queda registrado en el historial.
 * El mensaje lo envía una persona del equipo: nada se manda solo.
 */
export async function openWhatsApp(form: FormData) {
  const { user } = await requireAdmin();
  const email = text(form, "email")?.toLowerCase() ?? null;
  const phone = normalizePhone(text(form, "phone"));
  const tpl = WA_TEMPLATES.find((t) => t.key === text(form, "template"));
  if (!phone || !tpl) redirect("/admin/seguimiento?wa=sin-datos");

  const admin = createAdminClient();
  const { data: lead } = email
    ? await admin.from("sales_leads").select("id, whatsapp_consent, full_name").eq("email", email).maybeSingle()
    : await admin.from("sales_leads").select("id, whatsapp_consent, full_name").eq("phone", phone!).is("email", null).maybeSingle();
  if (!lead?.whatsapp_consent) redirect("/admin/seguimiento?wa=sin-autorizacion");

  const message = fillTemplate(tpl!.text, {
    nombre: lead.full_name ?? text(form, "full_name"),
    link: WHATSAPP_UTM_LINK,
    fecha: promoDeadlineLabel(),
  });
  await admin.from("sales_contact_log").insert({
    lead_key: email ?? phone!,
    template: tpl!.key,
    contacted_by: await adminName(user.id),
  });
  await admin.from("sales_leads").update({ last_contact_at: new Date().toISOString() }).eq("id", lead.id);
  redirect(`https://wa.me/${phone!.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`);
}
