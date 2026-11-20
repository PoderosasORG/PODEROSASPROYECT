import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCop, formatDate, formatMoney, resolvePeriod, todayBogota } from "@/lib/admin/format";
import { PeriodPicker } from "../PeriodPicker";
import { createExpense, createSubscription, toggleSubscription } from "./actions";

export const dynamic = "force-dynamic";

const input = "rounded-lg border border-gold-light/70 bg-white px-3 py-1.5 text-sm w-full";
const label = "flex flex-col gap-1 text-xs text-foreground/60";

function monthlyCop(s: { billing_period: string; amount_cop_cents: number | null }) {
  const v = Number(s.amount_cop_cents ?? 0);
  return s.billing_period === "anual" ? v / 12 : s.billing_period === "mensual" ? v : 0;
}

export default async function AdminGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requireAdmin();
  const { desde, hasta } = await searchParams;
  const period = resolvePeriod(desde, hasta);
  const admin = createAdminClient();

  const [{ data: subs }, { data: expenses }, { data: events }] = await Promise.all([
    admin.from("admin_subscriptions").select("*").order("is_active", { ascending: false }).order("service"),
    admin
      .from("admin_expenses")
      .select("*")
      .gte("expense_date", period.from)
      .lte("expense_date", period.to)
      .order("expense_date", { ascending: false }),
    admin.from("products").select("id, title").eq("type", "event").order("created_at", { ascending: false }),
  ]);

  const activeSubs = (subs ?? []).filter((s) => s.is_active);
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + monthlyCop(s), 0);
  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount_cop_cents), 0);
  const eventTitle = new Map((events ?? []).map((e) => [e.id, e.title]));
  const subName = new Map((subs ?? []).map((s) => [s.id, s.service]));

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- SUSCRIPCIONES ---------- */}
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="font-serif text-3xl">Suscripciones y servicios</h1>
          <p className="text-sm text-foreground/60">
            {activeSubs.length} activas · costo aproximado {formatCop(monthlyTotal)} al mes
          </p>
        </div>

        <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-left text-xs text-foreground/50">
              <tr>
                <th className="px-4 py-2">Servicio</th>
                <th className="px-3 py-2">Costo</th>
                <th className="px-3 py-2">En pesos / mes</th>
                <th className="px-3 py-2">Tarjeta</th>
                <th className="px-3 py-2">Quién paga</th>
                <th className="px-3 py-2">A nombre de</th>
                <th className="px-3 py-2">Renueva</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(subs ?? []).map((s) => (
                <tr key={s.id} className={`border-t border-gold-light/40 ${s.is_active ? "" : "opacity-50"}`}>
                  <td className="px-4 py-2">
                    <span className="font-medium">{s.service}</span>
                    {s.provider ? <span className="text-foreground/50"> · {s.provider}</span> : null}
                    {s.notes ? <p className="text-xs text-foreground/50">{s.notes}</p> : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatMoney(Number(s.amount_cents), s.currency)} / {s.billing_period}
                  </td>
                  <td className="px-3 py-2">{s.amount_cop_cents != null ? formatCop(monthlyCop(s)) : "—"}</td>
                  <td className="px-3 py-2">
                    {[s.card_label, s.card_last4 ? `•••• ${s.card_last4}` : null].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-3 py-2">{s.paid_by ?? "—"}</td>
                  <td className="px-3 py-2">{s.account_holder ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{s.next_renewal ? formatDate(`${s.next_renewal}T12:00:00-05:00`) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={toggleSubscription}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-gold hover:underline">{s.is_active ? "Marcar cancelada" : "Reactivar"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(subs ?? []).length === 0 ? (
            <p className="p-5 text-sm text-foreground/60">Todavía no hay suscripciones. Agrega Vercel, Bunny, Supabase, dominio…</p>
          ) : null}
        </div>

        <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
          <summary className="cursor-pointer font-medium">+ Agregar suscripción</summary>
          <form action={createSubscription} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={label}>Servicio *<input name="service" required className={input} placeholder="Bunny Stream" /></label>
            <label className={label}>Proveedor<input name="provider" className={input} placeholder="bunny.net" /></label>
            <label className={label}>Periodicidad
              <select name="billing_period" className={input} defaultValue="mensual">
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
                <option value="unico">Pago único</option>
              </select>
            </label>
            <label className={label}>Costo *<input name="amount" required inputMode="decimal" className={input} placeholder="25" /></label>
            <label className={label}>Moneda
              <select name="currency" className={input} defaultValue="COP">
                <option>COP</option><option>USD</option><option>EUR</option>
              </select>
            </label>
            <label className={label}>Valor en pesos (si no es COP)<input name="amount_cop" inputMode="decimal" className={input} placeholder="83.000" /></label>
            <label className={label}>Tarjeta (nombre)<input name="card_label" className={input} placeholder="Visa Bancolombia" /></label>
            <label className={label}>Últimos 4 dígitos<input name="card_last4" inputMode="numeric" maxLength={4} pattern="\d{4}" className={input} placeholder="1234" /></label>
            <label className={label}>Próxima renovación<input type="date" name="next_renewal" className={input} /></label>
            <label className={label}>Quién la paga<input name="paid_by" className={input} placeholder="Kat" /></label>
            <label className={label}>A nombre de quién está<input name="account_holder" className={input} placeholder="Shei Rivera" /></label>
            <label className={label}>Notas<input name="notes" className={input} /></label>
            <p className="sm:col-span-3 text-[11px] text-foreground/45">Solo se guardan los últimos 4 dígitos de la tarjeta. Nunca escribas el número completo.</p>
            <button className="sm:col-span-3 justify-self-start rounded-full bg-gold text-white px-5 py-2 text-sm">Guardar suscripción</button>
          </form>
        </details>
      </section>

      {/* ---------- GASTOS ---------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-3xl">Gastos y facturas</h2>
          <PeriodPicker basePath="/admin/gastos" from={period.from} to={period.to} />
          <p className="text-sm text-foreground/60">
            {expenses?.length ?? 0} gastos en el periodo · total {formatCop(expenseTotal)}
          </p>
        </div>

        <details className="rounded-2xl border border-gold-light/60 bg-white p-5" open={(expenses ?? []).length === 0}>
          <summary className="cursor-pointer font-medium">+ Registrar gasto y subir factura</summary>
          <form action={createExpense} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={`${label} sm:col-span-2`}>Concepto *<input name="concept" required className={input} placeholder="Alquiler salón evento 21 nov" /></label>
            <label className={label}>Categoría
              <select name="category" className={input} defaultValue="evento">
                <option value="evento">Evento</option>
                <option value="suscripcion">Suscripción</option>
                <option value="publicidad">Publicidad</option>
                <option value="produccion">Producción (video, foto, diseño)</option>
                <option value="honorarios">Honorarios</option>
                <option value="comisiones">Comisiones</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className={label}>Valor *<input name="amount" required inputMode="decimal" className={input} placeholder="350.000" /></label>
            <label className={label}>Moneda
              <select name="currency" className={input} defaultValue="COP">
                <option>COP</option><option>USD</option><option>EUR</option>
              </select>
            </label>
            <label className={label}>Valor en pesos (si no es COP)<input name="amount_cop" inputMode="decimal" className={input} /></label>
            <label className={label}>Fecha<input type="date" name="expense_date" defaultValue={todayBogota()} className={input} /></label>
            <label className={label}>Quién lo pagó<input name="paid_by" className={input} placeholder="Luz" /></label>
            <label className={label}>Tarjeta / medio<input name="card_label" className={input} placeholder="Nequi, Visa…" /></label>
            <label className={label}>Últimos 4 dígitos<input name="card_last4" inputMode="numeric" maxLength={4} pattern="\d{4}" className={input} /></label>
            <label className={label}>Evento relacionado
              <select name="event_product_id" className={input} defaultValue="">
                <option value="">— Ninguno —</option>
                {(events ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </label>
            <label className={label}>Suscripción relacionada
              <select name="subscription_id" className={input} defaultValue="">
                <option value="">— Ninguna —</option>
                {(subs ?? []).map((s) => <option key={s.id} value={s.id}>{s.service}</option>)}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>Factura (PDF o foto, máx. 4 MB)
              <input type="file" name="invoice" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" className="text-sm" />
            </label>
            <label className={label}>Notas<input name="notes" className={input} /></label>
            <button className="sm:col-span-3 justify-self-start rounded-full bg-gold text-white px-5 py-2 text-sm">Guardar gasto</button>
          </form>
        </details>

        <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-left text-xs text-foreground/50">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-3 py-2">Concepto</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Pagó</th>
                <th className="px-3 py-2">Medio</th>
                <th className="px-3 py-2">Relacionado</th>
                <th className="px-4 py-2">Factura</th>
              </tr>
            </thead>
            <tbody>
              {(expenses ?? []).map((e) => (
                <tr key={e.id} className="border-t border-gold-light/40 align-top">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(`${e.expense_date}T12:00:00-05:00`)}</td>
                  <td className="px-3 py-2">
                    {e.concept}
                    {e.notes ? <p className="text-xs text-foreground/50">{e.notes}</p> : null}
                  </td>
                  <td className="px-3 py-2 capitalize">{e.category}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {formatCop(Number(e.amount_cop_cents))}
                    {e.currency !== "COP" ? <p className="text-xs text-foreground/50">{formatMoney(Number(e.amount_cents), e.currency)}</p> : null}
                  </td>
                  <td className="px-3 py-2">{e.paid_by ?? "—"}</td>
                  <td className="px-3 py-2">{[e.card_label, e.card_last4 ? `•••• ${e.card_last4}` : null].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {e.event_product_id ? eventTitle.get(e.event_product_id) : null}
                    {e.subscription_id ? subName.get(e.subscription_id) : null}
                    {!e.event_product_id && !e.subscription_id ? "—" : null}
                  </td>
                  <td className="px-4 py-2">
                    {e.invoice_path ? (
                      <a href={`/admin/gastos/factura/${e.id}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                        Ver
                      </a>
                    ) : (
                      <span className="text-foreground/40">Sin factura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(expenses ?? []).length === 0 ? <p className="p-5 text-sm text-foreground/60">No hay gastos en este periodo.</p> : null}
        </div>
      </section>
    </div>
  );
}
