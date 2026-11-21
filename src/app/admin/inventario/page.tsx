import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCop, formatDate, todayBogota } from "@/lib/admin/format";
import {
  DEFAULT_ITEM_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  FIELD_LABELS,
  displayValue,
  leftover,
  missingFields,
  unitCents,
  type InventoryChange,
  type InventoryItem,
} from "@/lib/admin/inventory";
import { addItem, copyList, deleteItem, setAttendees, toggleItem, updateItem } from "./actions";

export const dynamic = "force-dynamic";

const input = "rounded-lg border border-gold-light/70 bg-white px-3 py-1.5 text-sm w-full";
const label = "flex flex-col gap-1 text-xs text-foreground/60";

function qty(n: number | null) {
  return n == null ? null : Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function money(c: number | null, estimated = false) {
  if (c == null) return <span className="text-amber-700 text-xs font-medium">Pendiente</span>;
  return (
    <>
      {estimated ? "≈ " : ""}
      {formatCop(Number(c))}
    </>
  );
}

function sumBy(items: InventoryItem[], key: (i: InventoryItem) => string) {
  const m = new Map<string, { confirmed: number; estimated: number; count: number }>();
  for (const i of items) {
    const k = key(i);
    const row = m.get(k) ?? { confirmed: 0, estimated: 0, count: 0 };
    row.count += 1;
    if (i.total_cents != null) {
      if (i.is_estimated) row.estimated += Number(i.total_cents);
      else row.confirmed += Number(i.total_cents);
    }
    m.set(k, row);
  }
  return [...m.entries()].sort((a, b) => b[1].confirmed + b[1].estimated - (a[1].confirmed + a[1].estimated));
}

/** Campos del formulario de compra (sirve para agregar y para editar). */
function ItemFields({ i, buyers }: { i?: Partial<InventoryItem>; buyers: string[] }) {
  return (
    <>
      <label className={label}>Tipo
        <select name="kind" defaultValue={i?.kind ?? "producto"} className={input}>
          <option value="producto">Producto físico</option>
          <option value="servicio">Servicio contratado</option>
        </select>
      </label>
      <label className={label}>Producto o servicio *<input name="item" required defaultValue={i?.item ?? ""} list="inv-products" className={input} placeholder="Libretas para asistentes" /></label>
      <label className={label}>Categoría
        <input name="item_category" defaultValue={i?.item_category ?? ""} list="inv-categories" className={input} placeholder="Papelería y materiales" />
      </label>
      <label className={label}>Tienda / proveedor<input name="store" defaultValue={i?.store ?? ""} list="inv-stores" className={input} placeholder="Dollarcity" /></label>
      <label className={label}>Cantidad<input name="quantity" defaultValue={i?.quantity != null ? String(i.quantity) : ""} inputMode="decimal" className={input} placeholder="Vacío = por confirmar" /></label>
      <label className={label}>Unidades utilizadas<input name="quantity_used" defaultValue={i?.quantity_used != null ? String(i.quantity_used) : ""} inputMode="decimal" className={input} placeholder="Vacío = por registrar" /></label>
      <label className={label}>Valor unitario (COP)<input name="unit_cost" defaultValue={i?.unit_cost_cents != null ? String(Number(i.unit_cost_cents) / 100) : ""} inputMode="decimal" className={input} placeholder="6.000" /></label>
      <label className={label}>Valor total (COP)<input name="total" defaultValue={i?.total_cents != null ? String(Number(i.total_cents) / 100) : ""} inputMode="decimal" className={input} placeholder="198.000" /></label>
      <label className={label}>Fecha de compra<input type="date" name="purchase_date" defaultValue={i?.purchase_date ?? (i ? "" : todayBogota())} className={input} /></label>
      <label className={label}>Quién lo compró<input name="bought_by" defaultValue={i?.bought_by ?? ""} list="inv-buyers" className={input} placeholder={buyers[0] ?? "Kat"} /></label>
      <label className={label}>¿Pagado?
        <select name="paid" defaultValue={i?.paid === true ? "si" : i?.paid === false ? "no" : i ? "" : "si"} className={input}>
          <option value="si">Sí, pagado</option>
          <option value="no">No, falta pagar</option>
          <option value="">Por confirmar</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>Notas<input name="notes" defaultValue={i?.notes ?? ""} className={input} placeholder="Presentación, promoción, uso…" /></label>
      <label className="flex items-center gap-2 text-xs text-foreground/70 sm:col-span-2">
        <input type="checkbox" name="is_estimated" defaultChecked={i?.is_estimated ?? false} />
        El valor es aproximado (estimado)
      </label>
    </>
  );
}

export default async function AdminInventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string; categoria?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const admin = createAdminClient();

  const [{ data: items }, { data: events }, { data: members }] = await Promise.all([
    admin.from("admin_inventory_items").select("*").order("purchase_date", { ascending: false, nullsFirst: true }).order("created_at"),
    admin.from("products").select("id, title").eq("type", "event").order("created_at"),
    admin.from("admin_members").select("user_id"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: creators } = memberIds.length
    ? await admin.from("creators").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string }[] };
  const adminNames = new Map((creators ?? []).map((c) => [c.id as string, c.display_name as string]));
  const buyers = (creators ?? []).map((c) => c.display_name as string).filter(Boolean);

  const all = (items ?? []) as InventoryItem[];

  // Eventos: los que existen en la web (productos tipo evento) más los
  // que solo existen en el inventario.
  type EventEntry = { name: string; productId: string | null; category: string };
  const eventMap = new Map<string, EventEntry>();
  for (const e of events ?? []) {
    eventMap.set(e.title, { name: e.title, productId: e.id, category: "evento_presencial_masterclass" });
  }
  for (const it of all) {
    const prev = eventMap.get(it.event_name);
    eventMap.set(it.event_name, { name: it.event_name, productId: prev?.productId ?? it.event_product_id, category: it.category });
  }
  if (params.evento && !eventMap.has(params.evento)) {
    const cat = params.categoria && EVENT_CATEGORY_LABELS[params.categoria] ? params.categoria : "evento_presencial_masterclass";
    eventMap.set(params.evento, { name: params.evento, productId: null, category: cat });
  }
  const eventList = [...eventMap.values()];
  const current = (params.evento && eventMap.get(params.evento)) || eventList[0];

  const byEventCategory = new Map<string, EventEntry[]>();
  for (const e of eventList) byEventCategory.set(e.category, [...(byEventCategory.get(e.category) ?? []), e]);

  const rows = current ? all.filter((i) => i.event_name === current.name) : [];

  const { data: historyRows } = current
    ? await admin
        .from("admin_inventory_history")
        .select("id, item_id, action, changes, changed_by, changed_at")
        .eq("event_name", current.name)
        .order("changed_at", { ascending: false })
    : { data: [] };
  const history = (historyRows ?? []) as InventoryChange[];
  const historyByItem = new Map<string, InventoryChange[]>();
  for (const h of history) historyByItem.set(h.item_id, [...(historyByItem.get(h.item_id) ?? []), h]);
  const deleted = history.filter((h) => h.action === "eliminado");
  const usageMissing = rows.filter((i) => i.status === "comprado" && i.quantity_used == null && i.kind !== "servicio").length;

  const { data: settings } = current
    ? await admin.from("admin_event_settings").select("attendees").eq("event_name", current.name).maybeSingle()
    : { data: null };
  const attendees = (settings?.attendees as number | null) ?? null;
  const bought = rows.filter((i) => i.status === "comprado");
  const pendingPurchase = rows.filter((i) => i.status === "pendiente");
  const confirmed = bought.filter((i) => !i.is_estimated && i.total_cents != null).reduce((s, i) => s + Number(i.total_cents), 0);
  const estimated = bought.filter((i) => i.is_estimated && i.total_cents != null).reduce((s, i) => s + Number(i.total_cents), 0);
  const plannedCost = pendingPurchase.reduce((s, i) => s + Number(i.total_cents ?? 0), 0);
  const units = bought.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
  const products = new Set(rows.map((i) => i.item.toLowerCase())).size;
  const noPrice = rows.filter((i) => i.total_cents == null);
  const noQty = rows.filter((i) => i.quantity == null);
  const incomplete = rows.filter((i) => missingFields(i).length > 0);
  const total = (list: InventoryItem[]) => list.reduce((s, i) => s + Number(i.total_cents ?? 0), 0);
  const physical = bought.filter((i) => i.kind !== "servicio");
  const services = bought.filter((i) => i.kind === "servicio");
  const grandTotal = total(bought);
  const paidTotal = total(bought.filter((i) => i.paid === true));
  const unpaid = bought.filter((i) => i.paid !== true);

  const itemCategories = [...new Set([...DEFAULT_ITEM_CATEGORIES, ...all.map((i) => i.item_category).filter((x): x is string => !!x)])];
  const stores = [...new Set(all.map((i) => i.store).filter((x): x is string => !!x))].sort();
  const productNames = [...new Set(all.map((i) => i.item))].sort();

  // Checklist agrupado por categoría del artículo.
  const groups = new Map<string, InventoryItem[]>();
  for (const i of rows) {
    const k = i.item_category || "Sin categoría";
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const otherLists = eventList.filter((e) => e.name !== current?.name && all.some((i) => i.event_name === e.name));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
      {/* ---------- Eventos por tipo ---------- */}
      <aside className="flex flex-col gap-5">
        <h1 className="font-serif text-3xl">Inventario</h1>
        {[...byEventCategory.entries()].map(([cat, list]) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{EVENT_CATEGORY_LABELS[cat] ?? cat}</p>
            {list.map((e) => {
              const n = all.filter((i) => i.event_name === e.name);
              const done = n.filter((i) => i.status === "comprado").length;
              const active = e.name === current?.name;
              return (
                <Link
                  key={e.name}
                  href={`/admin/inventario?evento=${encodeURIComponent(e.name)}`}
                  className={`rounded-xl border px-3 py-2 text-sm ${active ? "border-gold bg-white" : "border-gold-light/60 bg-white/60 hover:border-gold"}`}
                >
                  {e.name}
                  <span className="block text-[11px] text-foreground/50">
                    {n.length === 0 ? "Sin artículos" : `${done} de ${n.length} comprados`}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}

        <details className="rounded-xl border border-gold-light/60 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium">+ Lista para otro evento</summary>
          <form action="/admin/inventario" className="mt-3 flex flex-col gap-2">
            <label className={label}>Nombre del evento<input name="evento" required className={input} placeholder="Masterclass Medellín 2027" /></label>
            <label className={label}>Tipo
              <select name="categoria" className={input} defaultValue="evento_presencial_masterclass">
                {Object.entries(EVENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className="rounded-full bg-foreground text-white px-4 py-1.5">Crear lista</button>
          </form>
        </details>
      </aside>

      {current ? (
        <section className="flex flex-col gap-6 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gold">{EVENT_CATEGORY_LABELS[current.category] ?? current.category}</p>
              <h2 className="font-serif text-2xl">{current.name}</h2>
            </div>
            <a
              href={`/admin/inventario/exportar?evento=${encodeURIComponent(current.name)}`}
              className="rounded-full border border-gold-light/70 bg-white px-4 py-1.5 text-sm hover:border-gold"
            >
              Descargar Excel (CSV)
            </a>
          </div>

          {/* ---------- Resumen ---------- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-gold-light/60 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Inversión total del evento</p>
              <p className="font-serif text-2xl mt-1">{formatCop(grandTotal)}</p>
              <p className="text-[11px] text-foreground/45">
                Confirmado {formatCop(confirmed)}
                {estimated ? ` · ≈ ${formatCop(estimated)} estimado` : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-gold-light/60 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Productos físicos</p>
              <p className="font-serif text-2xl mt-1">{formatCop(total(physical))}</p>
              <p className="text-[11px] text-foreground/45">{products - new Set(services.map((i) => i.item.toLowerCase())).size} productos · {qty(units)} unidades · {usageMissing} sin uso registrado</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Servicios contratados</p>
              <p className="font-serif text-2xl mt-1">{formatCop(total(services))}</p>
              <p className="text-[11px] text-foreground/45">{services.length} servicios</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Costo por asistente</p>
              <p className="font-serif text-2xl mt-1">{attendees ? formatCop(grandTotal / attendees) : "—"}</p>
              <form action={setAttendees} className="mt-1 flex items-center gap-1 text-[11px] text-foreground/60">
                <input type="hidden" name="event_name" value={current.name} />
                <span>con</span>
                <input name="attendees" defaultValue={attendees ?? ""} inputMode="numeric" className="w-12 rounded border border-gold-light/70 bg-white px-1 py-0.5" />
                <span>asistentes</span>
                <button className="text-gold hover:underline">cambiar</button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gold-light/60 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Pagado</p>
              <p className="font-serif text-xl mt-1">{formatCop(paidTotal)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Pago pendiente o por confirmar</p>
              <p className="font-serif text-xl mt-1">{formatCop(total(unpaid))}</p>
              <p className="text-[11px] text-foreground/45">{unpaid.map((i) => i.item).join(" · ") || "Nada pendiente"}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Por completar</p>
              <p className="font-serif text-xl mt-1">{incomplete.length}</p>
              <p className="text-[11px] text-foreground/45">
                {noPrice.length} sin precio · {noQty.length} sin cantidad · {pendingPurchase.length} por comprar
                {plannedCost ? ` (${formatCop(plannedCost)})` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: "Por categoría", data: sumBy(bought, (i) => i.item_category || "Sin categoría") },
              { title: "Por tienda o proveedor", data: sumBy(bought, (i) => i.store || "Tienda por confirmar") },
              { title: "Productos físicos vs. servicios", data: sumBy(bought, (i) => (i.kind === "servicio" ? "Servicios contratados" : "Productos físicos")) },
              { title: "Por responsable", data: sumBy(bought, (i) => i.bought_by || "Responsable por confirmar") },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-gold-light/60 bg-white p-4">
                <p className="font-serif text-lg mb-2">{b.title}</p>
                <ul className="text-sm divide-y divide-gold-light/40">
                  {b.data.map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3 py-1.5">
                      <span>
                        {k} <span className="text-xs text-foreground/45">({v.count})</span>
                      </span>
                      <span className="text-right whitespace-nowrap">
                        {formatCop(v.confirmed)}
                        {v.estimated ? <span className="block text-xs text-sky-700">+ ≈ {formatCop(v.estimated)} estimado</span> : null}
                      </span>
                    </li>
                  ))}
                  {b.data.length === 0 ? <li className="py-1.5 text-foreground/50">Sin compras todavía.</li> : null}
                </ul>
              </div>
            ))}
          </div>

          {incomplete.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="font-medium text-sm mb-2">Información por completar</p>
              <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {incomplete.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>{i.item}</span>
                    <span className="text-xs text-amber-800">falta {missingFields(i).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* ---------- Checklist por categoría ---------- */}
          <datalist id="inv-buyers">{buyers.map((b) => <option key={b} value={b} />)}</datalist>
          <datalist id="inv-stores">{stores.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="inv-categories">{itemCategories.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="inv-products">{productNames.map((p) => <option key={p} value={p} />)}</datalist>

          {[...groups.entries()].map(([group, list]) => {
            const groupTotal = list.filter((i) => !i.is_estimated).reduce((s, i) => s + Number(i.total_cents ?? 0), 0);
            return (
              <div key={group} className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
                <div className="flex justify-between px-4 pt-3 pb-1">
                  <p className="font-serif text-lg">{group}</p>
                  <p className="text-sm text-foreground/60">Confirmado {formatCop(groupTotal)}</p>
                </div>
                <table className="w-full text-sm min-w-[1000px]">
                  <thead className="text-left text-xs text-foreground/50">
                    <tr>
                      <th className="px-4 py-2 w-10">✓</th>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-right">Usadas / Sobran</th>
                      <th className="px-3 py-2 text-right">Valor unitario</th>
                      <th className="px-3 py-2 text-right">Valor total</th>
                      <th className="px-3 py-2">Tienda</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Quién</th>
                      <th className="px-3 py-2">Pago</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((i) => {
                      const missing = missingFields(i);
                      return (
                        <tr key={i.id} className={`border-t border-gold-light/40 align-top ${i.status === "pendiente" ? "bg-amber-50/40" : ""}`}>
                          <td className="px-4 py-2">
                            <form action={toggleItem}>
                              <input type="hidden" name="id" value={i.id} />
                              <button
                                title={i.status === "comprado" ? "Marcar como pendiente de compra" : "Marcar como comprado"}
                                className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
                                  i.status === "comprado" ? "bg-emerald-600 border-emerald-600 text-white" : "border-foreground/40 bg-white"
                                }`}
                              >
                                {i.status === "comprado" ? "✓" : ""}
                              </button>
                            </form>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium">{i.item}</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {i.kind === "servicio" ? <span className="rounded-full bg-violet-100 px-2 text-[10px] text-violet-800">Servicio contratado</span> : null}
                              {i.status === "pendiente" ? <span className="rounded-full bg-amber-100 px-2 text-[10px] text-amber-800">{i.kind === "servicio" ? "Por contratar" : "Por comprar"}</span> : null}
                              {i.is_estimated ? <span className="rounded-full bg-sky-100 px-2 text-[10px] text-sky-800">Estimado</span> : null}
                              {missing.length ? <span className="rounded-full bg-orange-100 px-2 text-[10px] text-orange-800">Falta {missing.join(", ")}</span> : null}
                            </div>
                            {i.notes ? <p className="text-xs text-foreground/50 mt-0.5">{i.notes}</p> : null}
                          </td>
                          <td className="px-3 py-2 text-right">{qty(i.quantity) ?? <span className="text-amber-700 text-xs font-medium">Pendiente</span>}</td>
                          <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                            {i.kind === "servicio" ? (
                              <span className="text-foreground/40">—</span>
                            ) : i.quantity_used == null ? (
                              <span className="text-foreground/40">Por registrar</span>
                            ) : (
                              <>
                                {qty(i.quantity_used)} / <span className="font-medium">{qty(leftover(i)) ?? "—"}</span>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{money(unitCents(i), i.is_estimated)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{money(i.total_cents, i.is_estimated)}</td>
                          <td className="px-3 py-2">{i.store ?? <span className="text-amber-700 text-xs">Por confirmar</span>}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{i.purchase_date ? formatDate(`${i.purchase_date}T12:00:00-05:00`) : "—"}</td>
                          <td className="px-3 py-2">{i.bought_by ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{i.paid === true ? "Pagado" : i.paid === false ? "Falta pagar" : "Por confirmar"}</td>
                          <td className="px-4 py-2">
                            <details>
                              <summary className="cursor-pointer text-xs text-gold whitespace-nowrap">Editar</summary>
                              <div className="mt-2 w-[min(560px,80vw)] rounded-xl border border-gold-light/60 bg-white p-3 shadow-sm">
                                <form action={updateItem} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input type="hidden" name="id" value={i.id} />
                                  <ItemFields i={i} buyers={buyers} />
                                  <button className="sm:col-span-2 justify-self-start rounded-full bg-gold text-white px-4 py-1.5 text-xs">Guardar cambios</button>
                                </form>
                                <p className="mt-3 text-xs font-medium">¿Se volvió a comprar? Regístralo aparte (no borra esta compra):</p>
                                <form action={addItem} className="mt-1 flex flex-wrap items-end gap-2">
                                  <input type="hidden" name="event_name" value={current.name} />
                                  <input type="hidden" name="category" value={current.category} />
                                  {current.productId ? <input type="hidden" name="event_product_id" value={current.productId} /> : null}
                                  <input type="hidden" name="item" value={i.item} />
                                  <input type="hidden" name="item_category" value={i.item_category ?? ""} />
                                  <input name="quantity" placeholder="Cantidad" inputMode="decimal" className={`${input} w-24`} />
                                  <input name="total" placeholder="Valor total" inputMode="decimal" className={`${input} w-28`} />
                                  <input name="store" placeholder="Tienda" defaultValue={i.store ?? ""} list="inv-stores" className={`${input} w-32`} />
                                  <input type="date" name="purchase_date" defaultValue={todayBogota()} className={`${input} w-36`} />
                                  <button className="rounded-full bg-foreground text-white px-3 py-1.5 text-xs">Registrar compra</button>
                                </form>
                                {historyByItem.get(i.id)?.length ? (
                                  <div className="mt-3 border-t border-gold-light/50 pt-2">
                                    <p className="text-xs font-medium">Historial de cambios</p>
                                    <ul className="mt-1 max-h-40 overflow-y-auto text-[11px] text-foreground/70 space-y-1">
                                      {historyByItem.get(i.id)!.map((h) => (
                                        <li key={h.id}>
                                          <span className="text-foreground/45">
                                            {new Date(h.changed_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}
                                            {" · "}
                                            {h.changed_by ? (adminNames.get(h.changed_by) ?? "Administradora") : "Actualización por SQL"}:
                                          </span>{" "}
                                          {Object.entries(h.changes)
                                            .filter(([f]) => FIELD_LABELS[f])
                                            .map(([f, c]) => `${FIELD_LABELS[f]}: ${displayValue(f, c.antes)} → ${displayValue(f, c.despues)}`)
                                            .join(" · ")}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                                <form action={deleteItem} className="mt-3">
                                  <input type="hidden" name="id" value={i.id} />
                                  <button className="text-xs text-rose-700 hover:underline">Eliminar esta compra</button>
                                </form>
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-gold-light/60 bg-white p-5 text-sm text-foreground/60">
              Esta lista está vacía. Agrega lo que se compró o lo que hace falta.
            </p>
          ) : null}

          <details className="rounded-2xl border border-gold-light/60 bg-white p-5" open={rows.length === 0}>
            <summary className="cursor-pointer font-medium">+ Agregar producto o compra</summary>
            <form action={addItem} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input type="hidden" name="event_name" value={current.name} />
              <input type="hidden" name="category" value={current.category} />
              {current.productId ? <input type="hidden" name="event_product_id" value={current.productId} /> : null}
              <ItemFields buyers={buyers} />
              <label className={label}>Estado
                <select name="status" className={input} defaultValue="comprado">
                  <option value="comprado">Ya se compró</option>
                  <option value="pendiente">Falta comprar</option>
                </select>
              </label>
              <p className="sm:col-span-4 text-[11px] text-foreground/45">
                Llena lo que sepas: con cantidad y valor total se calcula el unitario, y con cantidad y unitario se calcula el
                total. Lo que dejes vacío queda marcado como pendiente para completarlo después con «Editar».
              </p>
              <button className="sm:col-span-4 justify-self-start rounded-full bg-gold text-white px-5 py-2 text-sm">Agregar</button>
            </form>
          </details>

          {/* ---------- Historial ---------- */}
          {bought.length > 0 ? (
            <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
              <summary className="cursor-pointer font-medium">Historial de compras ({bought.length})</summary>
              <ul className="mt-3 text-sm divide-y divide-gold-light/40">
                {[...bought]
                  .sort((a, b) => (b.purchase_date ?? "").localeCompare(a.purchase_date ?? "") || b.created_at.localeCompare(a.created_at))
                  .map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                      <span>
                        <span className="text-foreground/50">{i.purchase_date ? formatDate(`${i.purchase_date}T12:00:00-05:00`) : "Sin fecha"} · </span>
                        {i.item}
                        {i.quantity != null ? ` × ${qty(i.quantity)}` : ""}
                        <span className="text-foreground/50"> · {i.store ?? "tienda por confirmar"} · {i.bought_by ?? "—"}</span>
                      </span>
                      <span>{money(i.total_cents, i.is_estimated)}</span>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}

          {deleted.length > 0 ? (
            <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
              <summary className="cursor-pointer font-medium">Compras eliminadas ({deleted.length})</summary>
              <ul className="mt-3 text-sm divide-y divide-gold-light/40">
                {deleted.map((h) => (
                  <li key={h.id} className="py-1.5">
                    {String((h.changes as unknown as { item?: string }).item ?? "—")}
                    <span className="text-foreground/50">
                      {" · eliminada el "}
                      {new Date(h.changed_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium" })}
                      {h.changed_by ? ` por ${adminNames.get(h.changed_by) ?? "una administradora"}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-foreground/45">Los datos completos de cada compra eliminada quedan guardados en el historial.</p>
            </details>
          ) : null}

          {otherLists.length > 0 ? (
            <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
              <summary className="cursor-pointer font-medium">Copiar la lista de otro evento</summary>
              <form action={copyList} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="event_name" value={current.name} />
                <input type="hidden" name="category" value={current.category} />
                {current.productId ? <input type="hidden" name="event_product_id" value={current.productId} /> : null}
                <label className={`${label} min-w-64`}>Traer productos de
                  <select name="from_event" className={input}>
                    {otherLists.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
                  </select>
                </label>
                <button className="rounded-full bg-foreground text-white px-4 py-1.5 text-sm">Copiar como pendientes</button>
                <p className="w-full text-[11px] text-foreground/45">
                  Copia cada producto una vez, con sus cantidades y precios como referencia (marcados como estimados) y en
                  «Falta comprar», para usarlos de checklist.
                </p>
              </form>
            </details>
          ) : null}

          <p className="text-xs text-foreground/50">
            Lo comprado se suma como costo en «Finanzas» según la fecha de compra (los valores estimados se muestran
            aparte). Para no contarlo dos veces, no registres estas mismas compras también en «Gastos».
          </p>
        </section>
      ) : (
        <p className="text-sm text-foreground/60">No hay eventos todavía. Crea una lista para empezar.</p>
      )}
    </div>
  );
}
