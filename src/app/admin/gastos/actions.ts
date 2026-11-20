"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["suscripcion", "evento", "publicidad", "produccion", "honorarios", "comisiones", "otro"];
const PERIODS = ["mensual", "anual", "unico"];
const MAX_INVOICE_BYTES = 4 * 1024 * 1024;
const INVOICE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** "120.000", "120000", "19,99" → centavos. */
function moneyToCents(raw: string | null): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,]/g, "");
  // Formato colombiano: puntos de miles y coma decimal.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}($|\.)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function last4(raw: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  // Nunca se guarda el número completo: solo los últimos 4.
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export async function createSubscription(form: FormData) {
  const { user } = await requireAdmin();
  const service = text(form, "service");
  const amount = moneyToCents(text(form, "amount"));
  const currency = (text(form, "currency") ?? "COP").toUpperCase();
  const amountCop = currency === "COP" ? amount : moneyToCents(text(form, "amount_cop"));
  const period = text(form, "billing_period") ?? "mensual";
  if (!service || amount == null || !PERIODS.includes(period)) return;

  await createAdminClient().from("admin_subscriptions").insert({
    service,
    provider: text(form, "provider"),
    amount_cents: amount,
    currency,
    amount_cop_cents: amountCop,
    billing_period: period,
    next_renewal: text(form, "next_renewal"),
    card_label: text(form, "card_label"),
    card_last4: last4(text(form, "card_last4")),
    paid_by: text(form, "paid_by"),
    account_holder: text(form, "account_holder"),
    notes: text(form, "notes"),
    created_by: user.id,
  });
  revalidatePath("/admin/gastos");
}

export async function toggleSubscription(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data } = await admin.from("admin_subscriptions").select("is_active").eq("id", id).maybeSingle();
  if (!data) return;
  await admin.from("admin_subscriptions").update({ is_active: !data.is_active }).eq("id", id);
  revalidatePath("/admin/gastos");
}

export async function createExpense(form: FormData) {
  const { user } = await requireAdmin();
  const concept = text(form, "concept");
  const category = text(form, "category") ?? "otro";
  const amount = moneyToCents(text(form, "amount"));
  const currency = (text(form, "currency") ?? "COP").toUpperCase();
  const amountCop = currency === "COP" ? amount : moneyToCents(text(form, "amount_cop"));
  if (!concept || amount == null || amountCop == null || !CATEGORIES.includes(category)) return;

  const admin = createAdminClient();

  let invoicePath: string | null = null;
  let invoiceName: string | null = null;
  const file = form.get("invoice");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_INVOICE_BYTES || !INVOICE_TYPES.includes(file.type)) return;
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    invoicePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    invoiceName = file.name.slice(0, 200);
    const { error } = await admin.storage
      .from("facturas")
      .upload(invoicePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (error) {
      console.error("[admin] no se pudo subir la factura:", error.message);
      return;
    }
  }

  await admin.from("admin_expenses").insert({
    concept,
    category,
    amount_cents: amount,
    currency,
    amount_cop_cents: amountCop,
    expense_date: text(form, "expense_date") ?? undefined,
    paid_by: text(form, "paid_by"),
    card_label: text(form, "card_label"),
    card_last4: last4(text(form, "card_last4")),
    subscription_id: text(form, "subscription_id"),
    event_product_id: text(form, "event_product_id"),
    invoice_path: invoicePath,
    invoice_name: invoiceName,
    notes: text(form, "notes"),
    created_by: user.id,
  });
  revalidatePath("/admin/gastos");
  revalidatePath("/admin");
}
