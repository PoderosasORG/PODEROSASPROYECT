"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBogota } from "@/lib/admin/format";

const CATEGORIES = ["evento_presencial_masterclass", "evento_virtual", "otro"];

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** "120.000", "120000", "19,5" → número. */
function toNumber(raw: string | null): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}($|\.)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Nombre de la administradora que está usando el panel (para "quién lo compró"). */
async function adminName(userId: string) {
  const admin = createAdminClient();
  const { data: creator } = await admin.from("creators").select("display_name").eq("id", userId).maybeSingle();
  if (creator?.display_name) return creator.display_name as string;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (profile?.full_name as string | null) ?? null;
}

function back(eventName: string) {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  redirect(`/admin/inventario?evento=${encodeURIComponent(eventName)}`);
}

export async function addItem(form: FormData) {
  const { user } = await requireAdmin();
  const eventName = text(form, "event_name");
  const item = text(form, "item");
  const category = text(form, "category") ?? "evento_presencial_masterclass";
  const quantity = toNumber(text(form, "quantity")) ?? 1;
  const unit = toNumber(text(form, "unit_cost"));
  const status = text(form, "status") === "comprado" ? "comprado" : "pendiente";
  if (!eventName || !item || !CATEGORIES.includes(category) || quantity <= 0) return;

  const boughtBy = status === "comprado" ? (text(form, "bought_by") ?? (await adminName(user.id))) : text(form, "bought_by");

  await createAdminClient()
    .from("admin_inventory_items")
    .insert({
      category,
      event_name: eventName,
      event_product_id: text(form, "event_product_id"),
      item,
      quantity,
      unit_cost_cents: Math.round((unit ?? 0) * 100),
      status,
      purchase_date: status === "comprado" ? (text(form, "purchase_date") ?? todayBogota()) : text(form, "purchase_date"),
      bought_by: boughtBy,
      notes: text(form, "notes"),
      created_by: user.id,
    });
  back(eventName);
}

/** Marca o desmarca como comprado (el checklist). */
export async function toggleItem(form: FormData) {
  const { user } = await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("admin_inventory_items")
    .select("status, purchase_date, bought_by, event_name")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;

  const nowBought = row.status !== "comprado";
  await admin
    .from("admin_inventory_items")
    .update(
      nowBought
        ? {
            status: "comprado",
            purchase_date: row.purchase_date ?? todayBogota(),
            bought_by: row.bought_by ?? (await adminName(user.id)),
          }
        : { status: "pendiente" },
    )
    .eq("id", id);
  back(row.event_name);
}

export async function updateItem(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_inventory_items").select("event_name").eq("id", id).maybeSingle();
  if (!row) return;

  const quantity = toNumber(text(form, "quantity"));
  const unit = toNumber(text(form, "unit_cost"));
  const item = text(form, "item");
  await admin
    .from("admin_inventory_items")
    .update({
      ...(item ? { item } : {}),
      ...(quantity && quantity > 0 ? { quantity } : {}),
      ...(unit != null ? { unit_cost_cents: Math.round(unit * 100) } : {}),
      purchase_date: text(form, "purchase_date"),
      bought_by: text(form, "bought_by"),
      notes: text(form, "notes"),
    })
    .eq("id", id);
  back(row.event_name);
}

export async function deleteItem(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_inventory_items").select("event_name").eq("id", id).maybeSingle();
  if (!row) return;
  await admin.from("admin_inventory_items").delete().eq("id", id);
  back(row.event_name);
}

/**
 * Copia la lista de otro evento como checklist PENDIENTE para este:
 * mismos artículos, cantidades y valor unitario de referencia, sin
 * fecha ni quién lo compró.
 */
export async function copyList(form: FormData) {
  const { user } = await requireAdmin();
  const from = text(form, "from_event");
  const to = text(form, "event_name");
  const category = text(form, "category") ?? "evento_presencial_masterclass";
  if (!from || !to || from === to || !CATEGORIES.includes(category)) return;

  const admin = createAdminClient();
  const { data: source } = await admin
    .from("admin_inventory_items")
    .select("item, quantity, unit_cost_cents, notes")
    .eq("event_name", from)
    .order("created_at");
  if (!source?.length) return;

  await admin.from("admin_inventory_items").insert(
    source.map((s) => ({
      category,
      event_name: to,
      event_product_id: text(form, "event_product_id"),
      item: s.item,
      quantity: s.quantity,
      unit_cost_cents: s.unit_cost_cents,
      status: "pendiente",
      notes: s.notes,
      created_by: user.id,
    })),
  );
  back(to);
}
