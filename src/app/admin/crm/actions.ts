"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES = ["invitada_especial", "equipo"];
const UUID_RE = /^[0-9a-f-]{36}$/i;

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null;
}

/** "3001234567" → "+57 3001234567"; respeta un indicativo que ya venga. */
function normalizePhone(raw: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.replace(/^(\+\d{2})(\d{10})$/, "$1 $2");
  if (digits.length === 12 && digits.startsWith("57")) return `+57 ${digits.slice(2)}`;
  if (digits.length === 10) return `+57 ${digits}`;
  return digits;
}

/**
 * Edita teléfono, dirección, ciudad y país de una persona del CRM.
 * Compradora: se actualizan TODAS sus compras aprobadas (orderIds).
 * Invitada o equipo: se actualiza su fila en admin_contacts.
 */
export async function updatePerson(form: FormData) {
  await requireAdmin();
  const fields = {
    phone: normalizePhone(text(form, "phone")),
    address: text(form, "address"),
    city: text(form, "city"),
    country: text(form, "country"),
  };
  const admin = createAdminClient();
  const contactId = text(form, "contact_id");

  if (contactId && UUID_RE.test(contactId)) {
    await admin
      .from("admin_contacts")
      .update({ ...fields, full_name: text(form, "full_name") ?? undefined, email: text(form, "email") })
      .eq("id", contactId);
  } else {
    const ids = (text(form, "order_ids") ?? "").split(",").filter((id) => UUID_RE.test(id));
    if (ids.length === 0) return;
    await admin
      .from("orders")
      .update({
        buyer_phone: fields.phone,
        buyer_address: fields.address,
        buyer_city: fields.city,
        buyer_country: fields.country,
      })
      .in("id", ids)
      .eq("status", "approved");
  }
  revalidatePath("/admin/crm");
}

/** Agrega una invitada especial o una persona del equipo (costo cero). */
export async function addContact(form: FormData) {
  const { user } = await requireAdmin();
  const fullName = text(form, "full_name");
  const type = text(form, "contact_type");
  if (!fullName || !type || !TYPES.includes(type)) return;

  await createAdminClient()
    .from("admin_contacts")
    .insert({
      full_name: fullName,
      email: text(form, "email"),
      phone: normalizePhone(text(form, "phone")),
      city: text(form, "city"),
      country: text(form, "country"),
      contact_type: type,
      subtype: text(form, "subtype"),
      event_name: text(form, "event_name"),
      notes: text(form, "notes"),
      created_by: user.id,
    });
  revalidatePath("/admin/crm");
}
