import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCop, formatDate, todayBogota } from "@/lib/admin/format";
import { addItem, copyList, deleteItem, toggleItem, updateItem } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  evento_presencial_masterclass: "Eventos presenciales (masterclass)",
  evento_virtual: "Eventos virtuales",
  otro: "Otros",
};

type Item = {
  id: string;
  category: string;
  event_name: string;
  event_product_id: string | null;
  item: string;
  quantity: number;
  unit_cost_cents: number;
  total_cents: number;
  status: "pendiente" | "comprado";
  purchase_date: string | null;
  bought_by: string | null;
  notes: string | null;
};

const input = "rounded-lg border border-gold-light/70 bg-white px-3 py-1.5 text-sm w-full";
const label = "flex flex-col gap-1 text-xs text-foreground/60";

function qty(n: number) {
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
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
    admin.from("admin_inventory_items").select("*").order("status", { ascending: false }).order("created_at"),
    admin.from("products").select("id, title").eq("type", "event").order("created_at"),
    admin.from("admin_members").select("user_id"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: creators } = memberIds.length
    ? await admin.from("creators").select("display_name").in("id", memberIds)
    : { data: [] as { display_name: string }[] };
  const buyers = (creators ?? []).map((c) => c.display_name as string).filter(Boolean);

  const all = (items ?? []) as Item[];

  // Lista de eventos: los que existen en la web (productos tipo evento)
  // más cualquier evento que solo exista en el inventario.
  type EventEntry = { name: string; productId: string | null; category: string };
  const eventMap = new Map<string, EventEntry>();
  for (const e of events ?? []) {
    eventMap.set(e.title, { name: e.title, productId: e.id, category: "evento_presencial_masterclass" });
  }
  for (const it of all) {
    const prev = eventMap.get(it.event_name);
    eventMap.set(it.event_name, {
      name: it.event_name,
      productId: prev?.productId ?? it.event_product_id,
      category: it.category,
    });
  }
  if (params.evento && !eventMap.has(params.evento)) {
    const cat = params.categoria && CATEGORY_LABELS[params.categoria] ? params.categoria : "evento_presencial_masterclass";
    eventMap.set(params.evento, { name: params.evento, productId: null, category: cat });
  }
  const eventList = [...eventMap.values()];
  const current = (params.evento && eventMap.get(params.evento)) || eventList[0];

  const byCategory = new Map<string, EventEntry[]>();
  for (const e of eventList) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e]);

  const rows = current ? all.filter((i) => i.event_name === current.name) : [];
  const bought = rows.filter((i) => i.status === "comprado");
  const pending = rows.filter((i) => i.status === "pendiente");
  const spent = bought.reduce((s, i) => s + Number(i.total_cents), 0);
  const toSpend = pending.reduce((s, i) => s + Number(i.total_cents), 0);
  const otherLists = eventList.filter((e) => e.name !== current?.name && all.some((i) => i.event_name === e.name));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* ---------- Eventos por categoría ---------- */}
      <aside className="flex flex-col gap-5">
        <h1 className="font-serif text-3xl">Inventario</h1>
        {[...byCategory.entries()].map(([cat, list]) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{CATEGORY_LABELS[cat] ?? cat}</p>
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
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className="rounded-full bg-foreground text-white px-4 py-1.5">Crear lista</button>
          </form>
        </details>
      </aside>

      {/* ---------- Checklist del evento ---------- */}
      {current ? (
        <section className="flex flex-col gap-5 min-w-0">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold">{CATEGORY_LABELS[current.category] ?? current.category}</p>
            <h2 className="font-serif text-2xl">{current.name}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gold-light/60 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Avance</p>
              <p className="font-serif text-2xl mt-1">{bought.length} de {rows.length}</p>
              <p className="text-[11px] text-foreground/45">artículos comprados</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Ya gastado</p>
              <p className="font-serif text-2xl mt-1">{formatCop(spent)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-foreground/50">Falta por comprar</p>
              <p className="font-serif text-2xl mt-1">{formatCop(toSpend)}</p>
              <p className="text-[11px] text-foreground/45">{pending.length} artículos pendientes</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-left text-xs text-foreground/50">
                <tr>
                  <th className="px-4 py-2 w-10">✓</th>
                  <th className="px-3 py-2">Qué se compró</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Valor unitario</th>
                  <th className="px-3 py-2 text-right">Valor total</th>
                  <th className="px-3 py-2">Fecha de compra</th>
                  <th className="px-3 py-2">Quién lo compró</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className={`border-t border-gold-light/40 align-top ${i.status === "comprado" ? "" : "bg-amber-50/40"}`}>
                    <td className="px-4 py-2">
                      <form action={toggleItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <button
                          title={i.status === "comprado" ? "Marcar como pendiente" : "Marcar como comprado"}
                          className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
                            i.status === "comprado" ? "bg-emerald-600 border-emerald-600 text-white" : "border-foreground/40 bg-white"
                          }`}
                        >
                          {i.status === "comprado" ? "✓" : ""}
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-2">
                      <span className={i.status === "comprado" ? "" : "font-medium"}>{i.item}</span>
                      {i.notes ? <p className="text-xs text-foreground/50">{i.notes}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-right">{qty(i.quantity)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatCop(Number(i.unit_cost_cents))}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{formatCop(Number(i.total_cents))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {i.purchase_date ? formatDate(`${i.purchase_date}T12:00:00-05:00`) : <span className="text-foreground/40">Pendiente</span>}
                    </td>
                    <td className="px-3 py-2">{i.bought_by ?? "—"}</td>
                    <td className="px-4 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-gold">Editar</summary>
                        <form action={updateItem} className="mt-2 flex w-56 flex-col gap-2">
                          <input type="hidden" name="id" value={i.id} />
                          <input name="item" defaultValue={i.item} className={input} />
                          <div className="flex gap-2">
                            <input name="quantity" defaultValue={String(i.quantity)} inputMode="decimal" className={input} title="Cantidad" />
                            <input name="unit_cost" defaultValue={String(Number(i.unit_cost_cents) / 100)} inputMode="decimal" className={input} title="Valor unitario" />
                          </div>
                          <input type="date" name="purchase_date" defaultValue={i.purchase_date ?? ""} className={input} />
                          <input name="bought_by" defaultValue={i.bought_by ?? ""} list="admin-buyers" placeholder="Quién lo compró" className={input} />
                          <input name="notes" defaultValue={i.notes ?? ""} placeholder="Notas" className={input} />
                          <button className="rounded-full bg-gold text-white px-3 py-1 text-xs">Guardar</button>
                        </form>
                        <form action={deleteItem} className="mt-2">
                          <input type="hidden" name="id" value={i.id} />
                          <button className="text-xs text-rose-700 hover:underline">Eliminar artículo</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-gold-light/60 text-sm">
                    <td colSpan={4} className="px-4 py-2 text-right text-foreground/60">Total de la lista</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatCop(spent + toSpend)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
            {rows.length === 0 ? <p className="p-5 text-sm text-foreground/60">Esta lista está vacía. Agrega lo que se compró o lo que hace falta.</p> : null}
          </div>

          <datalist id="admin-buyers">
            {buyers.map((b) => <option key={b} value={b} />)}
          </datalist>

          <details className="rounded-2xl border border-gold-light/60 bg-white p-5" open={rows.length === 0}>
            <summary className="cursor-pointer font-medium">+ Agregar artículo</summary>
            <form action={addItem} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input type="hidden" name="event_name" value={current.name} />
              <input type="hidden" name="category" value={current.category} />
              {current.productId ? <input type="hidden" name="event_product_id" value={current.productId} /> : null}
              <label className={`${label} sm:col-span-2`}>Qué se compró / qué hace falta *<input name="item" required className={input} placeholder="Libretas para asistentes" /></label>
              <label className={label}>Cantidad<input name="quantity" defaultValue="1" inputMode="decimal" className={input} /></label>
              <label className={label}>Valor unitario (COP)<input name="unit_cost" inputMode="decimal" className={input} placeholder="12.000" /></label>
              <label className={label}>Estado
                <select name="status" className={input} defaultValue="comprado">
                  <option value="comprado">Ya se compró</option>
                  <option value="pendiente">Falta comprar</option>
                </select>
              </label>
              <label className={label}>Fecha de compra<input type="date" name="purchase_date" defaultValue={todayBogota()} className={input} /></label>
              <label className={label}>Quién lo compró<input name="bought_by" list="admin-buyers" className={input} placeholder="Kat" /></label>
              <label className={label}>Notas<input name="notes" className={input} placeholder="Tienda, color, talla…" /></label>
              <p className="sm:col-span-4 text-[11px] text-foreground/45">
                El valor total se calcula solo (cantidad × valor unitario). Si eliges «Ya se compró» y dejas «Quién lo compró» vacío, queda tu nombre.
              </p>
              <button className="sm:col-span-4 justify-self-start rounded-full bg-gold text-white px-5 py-2 text-sm">Agregar</button>
            </form>
          </details>

          {otherLists.length > 0 ? (
            <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
              <summary className="cursor-pointer font-medium">Copiar la lista de otro evento</summary>
              <form action={copyList} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="event_name" value={current.name} />
                <input type="hidden" name="category" value={current.category} />
                {current.productId ? <input type="hidden" name="event_product_id" value={current.productId} /> : null}
                <label className={`${label} min-w-64`}>Traer artículos de
                  <select name="from_event" className={input}>
                    {otherLists.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
                  </select>
                </label>
                <button className="rounded-full bg-foreground text-white px-4 py-1.5 text-sm">Copiar como pendientes</button>
                <p className="w-full text-[11px] text-foreground/45">
                  Copia los mismos artículos, cantidades y valores de referencia, todos como «Falta comprar», para usarlos de checklist.
                </p>
              </form>
            </details>
          ) : null}

          <p className="text-xs text-foreground/50">
            Lo marcado como comprado se suma como costo en «Finanzas» (según la fecha de compra). Para no contarlo dos
            veces, no registres esas mismas compras también en «Gastos».
          </p>
        </section>
      ) : (
        <p className="text-sm text-foreground/60">No hay eventos todavía. Crea una lista para empezar.</p>
      )}
    </div>
  );
}
