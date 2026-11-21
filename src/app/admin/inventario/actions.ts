"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBogota } from "@/lib/admin/format";
import { resolvePrices } from "@/lib/admin/inventory";

const CATEGORIES = ["evento_presencial_masterclass", "evento_virtual", "otro"];

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** "120.000", "120000", "19,5" → número. Vacío → null. */
function toNumber(raw: string | null): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}($|\.)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function cents(raw: string | null) {
  const n = toNumber(raw);
  return n == null ? null : Math.round(n * 100);
}

function paidValue(raw: string | null): boolean | null {
  if (raw === "si") return true;
  if (raw === "no") return false;
  return null;
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

/** Campos editables comunes a crear y editar. */
function itemFields(form: FormData) {
  const quantityRaw = toNumber(text(form, "quantity"));
  const quantity = quantityRaw && quantityRaw > 0 ? quantityRaw : null;
  const { unit, total } = resolvePrices(quantity, cents(text(form, "unit_cost")), cents(text(form, "total")));
  const usedRaw = toNumber(text(form, "quantity_used"));
  return {
    quantity_used: usedRaw,
    item: text(form, "item"),
    item_category: text(form, "item_category"),
    quantity,
    unit_cost_cents: unit,
    total_cents: total,
    store: text(form, "store"),
    paid: paidValue(text(form, "paid")),
    is_estimated: form.get("is_estimated") === "on",
    purchase_date: text(form, "purchase_date"),
    bought_by: text(form, "bought_by"),
    notes: text(form, "notes"),
  };
}

/** Nueva compra. Nunca sobrescribe: cada compra es un registro aparte. */
export async function addItem(form: FormData) {
  const { user } = await requireAdmin();
  const eventName = text(form, "event_name");
  const category = text(form, "category") ?? "evento_presencial_masterclass";
  const status = text(form, "status") === "pendiente" ? "pendiente" : "comprado";
  const fields = itemFields(form);
  if (!eventName || !fields.item || !CATEGORIES.includes(category)) return;

  await createAdminClient()
    .from("admin_inventory_items")
    .insert({
      ...fields,
      category,
      event_name: eventName,
      event_product_id: text(form, "event_product_id"),
      status,
      purchase_date: status === "comprado" ? (fields.purchase_date ?? todayBogota()) : fields.purchase_date,
      bought_by: status === "comprado" ? (fields.bought_by ?? (await adminName(user.id))) : fields.bought_by,
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
            updated_by: user.id,
          }
        : { status: "pendiente", updated_by: user.id },
    )
    .eq("id", id);
  back(row.event_name);
}

export async function updateItem(form: FormData) {
  const { user } = await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_inventory_items").select("event_name").eq("id", id).maybeSingle();
  if (!row) return;

  const { item, ...rest } = itemFields(form);
  await admin
    .from("admin_inventory_items")
    .update({ ...(item ? { item } : {}), ...rest, updated_by: user.id })
    .eq("id", id);
  back(row.event_name);
}

export async function deleteItem(form: FormData) {
  const { user } = await requireAdmin();
  const id = text(form, "id");
  if (!id) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_inventory_items").select("event_name").eq("id", id).maybeSingle();
  if (!row) return;
  // Primero se marca quién elimina, para que el historial lo registre.
  await admin.from("admin_inventory_items").update({ updated_by: user.id }).eq("id", id);
  await admin.from("admin_inventory_items").delete().eq("id", id);
  back(row.event_name);
}

/**
 * Copia la lista de otro evento como checklist PENDIENTE para este:
 * mismos artículos, categorías, cantidades y precios como referencia
 * (marcados como estimados), sin fecha ni quién lo compró.
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
    .select("item, item_category, quantity, unit_cost_cents, total_cents, store")
    .eq("event_name", from)
    .order("created_at");
  if (!source?.length) return;

  // Si el mismo producto se compró varias veces, se copia una sola vez.
  const seen = new Set<string>();
  const unique = source.filter((s) => {
    const k = s.item.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  await admin.from("admin_inventory_items").insert(
    unique.map((s) => ({
      category,
      event_name: to,
      event_product_id: text(form, "event_product_id"),
      item: s.item,
      item_category: s.item_category,
      quantity: s.quantity,
      unit_cost_cents: s.unit_cost_cents,
      total_cents: s.total_cents,
      store: s.store,
      status: "pendiente",
      is_estimated: true,
      notes: `Referencia de «${from}»`,
      created_by: user.id,
    })),
  );
  back(to);
}
