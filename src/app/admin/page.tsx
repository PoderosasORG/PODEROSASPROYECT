import { requireAdmin } from "@/lib/admin/auth";
import { loadApprovedOrders } from "@/lib/admin/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCop, resolvePeriod } from "@/lib/admin/format";
import { WOMPI_FIXED_COP, WOMPI_IVA, WOMPI_PERCENT } from "@/lib/admin/wompiFee";
import { PeriodPicker } from "./PeriodPicker";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint, tone = "white" }: { label: string; value: string; hint?: string; tone?: "white" | "green" | "red" }) {
  const toneClass =
    tone === "green" ? "bg-emerald-50 border-emerald-200" : tone === "red" ? "bg-rose-50 border-rose-200" : "bg-white border-gold-light/60";
  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="font-serif text-2xl mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-foreground/45 mt-1">{hint}</p> : null}
    </div>
  );
}

type Row = { key: string; ventas: number; bruto: number; comision: number };

function groupBy<T>(items: T[], key: (t: T) => string, toRow: (k: string, items: T[]) => Row) {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return [...m.entries()].map(([k, v]) => toRow(k, v)).sort((a, b) => b.bruto - a.bruto);
}

function BreakdownTable({ title, keyLabel, rows }: { title: string; keyLabel: string; rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-gold-light/60 bg-white overflow-hidden">
      <p className="px-5 pt-4 pb-2 font-serif text-lg">{title}</p>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-foreground/60">Sin ventas en este periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-foreground/50">
              <tr>
                <th className="px-5 py-2">{keyLabel}</th>
                <th className="px-3 py-2 text-right">Ventas</th>
                <th className="px-3 py-2 text-right">Ingreso bruto</th>
                <th className="px-3 py-2 text-right">Comisión Wompi</th>
                <th className="px-5 py-2 text-right">Neto recibido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-gold-light/40">
                  <td className="px-5 py-2">{r.key}</td>
                  <td className="px-3 py-2 text-right">{r.ventas}</td>
                  <td className="px-3 py-2 text-right">{formatCop(r.bruto)}</td>
                  <td className="px-3 py-2 text-right text-rose-700">−{formatCop(r.comision)}</td>
                  <td className="px-5 py-2 text-right font-medium">{formatCop(r.bruto - r.comision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function AdminFinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requireAdmin();
  const { desde, hasta } = await searchParams;
  const period = resolvePeriod(desde, hasta);

  const allInPeriod = await loadApprovedOrders({ fromIso: period.fromIso, toIsoExclusive: period.toIsoExclusive });
  const orders = allInPeriod.filter((o) => !o.isTest);
  const testCount = allInPeriod.length - orders.length;

  const admin = createAdminClient();
  const { data: expenses } = await admin
    .from("admin_expenses")
    .select("category, amount_cop_cents")
    .gte("expense_date", period.from)
    .lte("expense_date", period.to);

  const bruto = orders.reduce((s, o) => s + o.amount_cents, 0);
  const brutoWompi = orders.filter((o) => !o.isDirect).reduce((s, o) => s + o.amount_cents, 0);
  const brutoDirecto = bruto - brutoWompi;
  const comisiones = orders.reduce((s, o) => s + o.feeCents, 0);
  const costos = (expenses ?? []).reduce((s, e) => s + Number(e.amount_cop_cents), 0);
  const utilidad = bruto - comisiones - costos;
  const feeIsEstimated = orders.some((o) => !o.isDirect && o.wompi_fee_cents == null);

  const costByCategory = new Map<string, number>();
  for (const e of expenses ?? []) {
    costByCategory.set(e.category, (costByCategory.get(e.category) ?? 0) + Number(e.amount_cop_cents));
  }

  const toRow = (k: string, items: typeof orders): Row => ({
    key: k,
    ventas: items.length,
    bruto: items.reduce((s, o) => s + o.amount_cents, 0),
    comision: items.reduce((s, o) => s + o.feeCents, 0),
  });
  const byAccount = groupBy(orders, (o) => `${o.creator_name}${o.isDirect ? " (Nequi directo)" : " (Wompi)"}`, toRow);
  const byProduct = groupBy(orders, (o) => o.product_title, toRow);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl">Reporte financiero</h1>
        <PeriodPicker basePath="/admin" from={period.from} to={period.to} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Ingresos brutos" value={formatCop(bruto)} hint={`${orders.length} ventas · Wompi ${formatCop(brutoWompi)} · Nequi directo ${formatCop(brutoDirecto)}`} />
        <Stat label="Comisiones Wompi" value={`−${formatCop(comisiones)}`} hint={feeIsEstimated ? "Estimada con la tarifa publicada (ver nota)" : "Con IVA"} tone="red" />
        <Stat label="Costos y gastos" value={`−${formatCop(costos)}`} hint={`${expenses?.length ?? 0} gastos registrados en el periodo`} tone="red" />
        <Stat label="Utilidad neta" value={formatCop(utilidad)} hint="Ingresos − comisiones − costos" tone={utilidad >= 0 ? "green" : "red"} />
      </div>

      <BreakdownTable title="¿A qué cuenta llegó el dinero?" keyLabel="Cuenta receptora" rows={byAccount} />
      <BreakdownTable title="Ventas por producto" keyLabel="Producto" rows={byProduct} />

      <div className="rounded-2xl border border-gold-light/60 bg-white p-5">
        <p className="font-serif text-lg mb-2">Costos por categoría</p>
        {costByCategory.size === 0 ? (
          <p className="text-sm text-foreground/60">No hay gastos registrados en este periodo. Agrégalos en «Gastos y suscripciones».</p>
        ) : (
          <ul className="text-sm divide-y divide-gold-light/40">
            {[...costByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, v]) => (
              <li key={cat} className="flex justify-between py-1.5">
                <span className="capitalize">{cat}</span>
                <span>{formatCop(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-foreground/50 leading-relaxed">
        Nota: la comisión de Wompi se estima con su tarifa publicada ({(WOMPI_PERCENT * 100).toFixed(2)} % + $
        {WOMPI_FIXED_COP.toLocaleString("es-CO")} + IVA {Math.round(WOMPI_IVA * 100)} %), porque Wompi no la envía en
        cada pago. El valor exacto está en el extracto de Wompi de cada cuenta; no incluye retenciones. Los pagos
        directos a Nequi no tienen comisión.
        {testCount > 0 ? ` Se excluyen ${testCount} órdenes de prueba.` : ""}
      </p>
    </div>
  );
}
