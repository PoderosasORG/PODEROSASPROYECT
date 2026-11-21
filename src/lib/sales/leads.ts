import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const LEAD_STATUSES = [
  { key: "nuevo", label: "Nuevo contacto" },
  { key: "interesada", label: "Interesada" },
  { key: "solicito_info", label: "Solicitó información" },
  { key: "checkout", label: "Checkout iniciado" },
  { key: "pago_pendiente", label: "Pago pendiente" },
  { key: "compra", label: "Compra confirmada" },
  { key: "no_interesada", label: "No interesada" },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]["key"];

/** "3001234567" / "57 300…" / "+57 300…" → "+573001234567" (formato wa.me sin espacios). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Crea o actualiza un contacto comercial. Nunca borra la autorización de
 * WhatsApp que ya existía; solo la activa si viene explícita.
 */
export async function upsertLead(params: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  source: string;
  status?: LeadStatus;
  whatsappConsent?: boolean;
  consentSource?: string;
  question?: string | null;
}) {
  const admin = createAdminClient();
  const email = params.email?.trim().toLowerCase() || null;
  const phone = normalizePhone(params.phone);
  if (!email && !phone) return;

  const { data: existing } = email
    ? await admin.from("sales_leads").select("*").eq("email", email).maybeSingle()
    : await admin.from("sales_leads").select("*").eq("phone", phone!).is("email", null).maybeSingle();

  const now = new Date().toISOString();
  const consent = params.whatsappConsent ? { whatsapp_consent: true, consent_at: now, consent_source: params.consentSource ?? params.source } : {};

  if (!existing) {
    await admin.from("sales_leads").insert({
      email,
      phone,
      full_name: params.fullName ?? null,
      source: params.source,
      status: params.status ?? "nuevo",
      question: params.question ?? null,
      ...consent,
    });
    return;
  }
  await admin
    .from("sales_leads")
    .update({
      phone: existing.phone ?? phone,
      full_name: existing.full_name ?? params.fullName ?? null,
      ...(params.status && existing.status !== "compra" ? { status: params.status } : {}),
      ...(params.question ? { question: params.question } : {}),
      ...(params.whatsappConsent && !existing.whatsapp_consent ? consent : {}),
      updated_at: now,
    })
    .eq("id", existing.id);
}
