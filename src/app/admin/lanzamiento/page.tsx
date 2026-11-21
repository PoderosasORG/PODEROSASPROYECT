import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCop, formatDate, resolvePeriod } from "@/lib/admin/format";
import { LAUNCH_PRICE_CENTS, METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";
import { UTM_LINKS } from "@/lib/analytics/utm";
import { PeriodPicker } from "../PeriodPicker";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

// Inicio del lanzamiento (para el periodo por defecto del tablero).
const LAUNCH_START = "2026-11-01";
// Un pedido sin pagar por más de 2 horas cuenta como checkout abandonado.
const ABANDON_MS = 2 * 60 * 60 * 1000;
const PAGE = 1000;

type Order = { id: string; status: string; amount_cents: number; origin: string | null; created_at: string; wompi_transaction_id: string | null };
type Visit = { visitor_id: string; page: string; origin: string | null; visits: number };
type Click = { event: string; location: string | null; origin: string | null; visitor_id: string | null };

// Supabase devuelve máximo 1000 filas por consulta: se pide por páginas.
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; from < 50_000; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null as string | null };
}

function nowMs() {
  return Date.now();
}

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)} %` : "—");
const DECLINED = new Set(["declined", "voided", "error"]);

export default async function LanzamientoPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requireAdmin();
  const { desde, hasta } = await searchParams;
  const period = resolvePeriod(desde ?? LAUNCH_START, hasta);
  const admin = createAdminClient();

  const [visitsRes, ordersRes, clicksRes] = await Promise.all([
    fetchAll<Visit>((a, b) =>
      admin
        .from("landing_visits")
        .select("visitor_id, page, origin, visits")
        .gte("last_seen", period.fromIso)
        .lt("first_seen", period.toIsoExclusive)
        .range(a, b),
    ),
    fetchAll<Order>((a, b) =>
      admin
        .from("orders")
        .select("id, status, amount_cents, origin, created_at, wompi_transaction_id")
        .eq("product_id", METODOLOGIA_PODEROSAS_PRODUCT_ID)
        .gte("created_at", period.fromIso)
        .lt("created_at", period.toIsoExclusive)
        .order("created_at", { ascending: false })
        .range(a, b),
    ),
    fetchAll<Click>((a, b) =>
      admin
        .from("funnel_events")
        .select("event, location, origin, visitor_id")
        .gte("created_at", period.fromIso)
        .lt("created_at", period.toIsoExclusive)
        .range(a, b),
    ),
  ]);

  // Pedidos de prueba (PRUEBA-…) no cuentan.
  const orders = ordersRes.rows.filter((o) => !(o.wompi_transaction_id ?? "").startsWith("PRUEBA"));
  const visits = visitsRes.rows;
  const clicks = clicksRes.rows;
  const now = nowMs();

  const approved = orders.filter((o) => o.status === "approved");
  const declined = orders.filter((o) => DECLINED.has(o.status));
  const abandoned = orders.filter((o) => o.status === "pending" && now - new Date(o.created_at).getTime() > ABANDON_MS);
  const pendingNow = orders.filter((o) => o.status === "pending" && !abandoned.includes(o));
  const gross = approved.reduce((s, o) => s + o.amount_cents, 0);
  const promoSeats = approved.filter((o) => o.amount_cents === LAUNCH_PRICE_CENTS).length;
  const uniqueVisitors = visits.length;
  const totalVisits = visits.reduce((s, v) => s + (v.visits ?? 1), 0);
  const buyClicks = clicks.filter((c) => c.event === "cta_comprar");
  const goClicks = clicks.filter((c) => c.event === "cta_ir_a_metodologia");

  // Por fuente de tráfico.
  type Row = { visitors: number; clicks: number; checkouts: number; sales: number; revenue: number };
  const bySource = new Map<string, Row>();
  const row = (k: string | null) => {
    const key = k || "Directo";
    if (!bySource.has(key)) bySource.set(key, { visitors: 0, clicks: 0, checkouts: 0, sales: 0, revenue: 0 });
    return bySource.get(key)!;
  };
  visits.forEach((v) => row(v.origin).visitors++);
  buyClicks.forEach((c) => row(c.origin).clicks++);
  orders.forEach((o) => {
    const r = row(o.origin);
    r.checkouts++;
    if (o.status === "approved") {
      r.sales++;
      r.revenue += o.amount_cents;
    }
  });
  const sources = [...bySource.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].visitors - a[1].visitors);

  // Botones con más clics.
  const byButton = new Map<string, number>();
  clicks.forEach((c) => {
    const name = c.event === "cta_comprar" ? "Comprar" : c.event === "cta_cuotas" ? "Ver cuotas" : "Ir a la metodología";
    const k = `${name} · ${c.location ?? "—"}`;
    byButton.set(k, (byButton.get(k) ?? 0) + 1);
  });

  const cards = [
    { label: "Visitas a la landing", value: totalVisits.toLocaleString("es-CO"), hint: `${uniqueVisitors.toLocaleString("es-CO")} personas distintas` },
    { label: "Clics en comprar", value: buyClicks.length.toLocaleString("es-CO"), hint: `${goClicks.length} clics hacia la metodología desde el inicio` },
    { label: "Checkouts iniciados", value: orders.length.toLocaleString("es-CO"), hint: `${pendingNow.length} en curso ahora` },
    { label: "Pagos aprobados", value: approved.length.toLocaleString("es-CO"), hint: `${pct(approved.length, orders.length)} de los checkouts` },
    { label: "Pagos rechazados", value: declined.length.toLocaleString("es-CO"), hint: `${pct(declined.length, orders.length)} de los checkouts` },
    { label: "Abandono de checkout", value: pct(abandoned.length, orders.length), hint: `${abandoned.length} sin pagar después de 2 h` },
    { label: "Tasa de conversión", value: pct(approved.length, uniqueVisitors), hint: "compras ÷ personas que visitaron" },
    { label: "Ingresos brutos", value: formatCop(gross), hint: `${approved.length} ventas · sin descontar comisiones` },
    { label: "Cupos promocionales vendidos", value: promoSeats.toLocaleString("es-CO"), hint: `a ${formatCop(LAUNCH_PRICE_CENTS)}` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl">Lanzamiento · Metodología PODEROSAS 2026–2027</h1>
        <AutoRefresh />
      </div>
      <PeriodPicker basePath="/admin/lanzamiento" from={period.from} to={period.to} />

      {(visitsRes.error || ordersRes.error || clicksRes.error) && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Faltan datos: {[visitsRes.error, ordersRes.error, clicksRes.error].filter(Boolean).join(" · ")}. Si dice que no
          existe una tabla, falta correr el SQL de medición en Supabase.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gold-light/60 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            <p className="mt-1 text-xs text-foreground/50">{c.hint}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl">Por fuente de tráfico</h2>
        <div className="overflow-x-auto rounded-2xl border border-gold-light/60 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-foreground/50">
              <tr>
                <th className="p-3">Fuente</th>
                <th className="p-3 text-right">Personas</th>
                <th className="p-3 text-right">Clics comprar</th>
                <th className="p-3 text-right">Checkouts</th>
                <th className="p-3 text-right">Ventas</th>
                <th className="p-3 text-right">Conversión</th>
                <th className="p-3 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(([name, r]) => (
                <tr key={name} className="border-t border-gold-light/40">
                  <td className="p-3">{name}</td>
                  <td className="p-3 text-right">{r.visitors}</td>
                  <td className="p-3 text-right">{r.clicks}</td>
                  <td className="p-3 text-right">{r.checkouts}</td>
                  <td className="p-3 text-right">{r.sales}</td>
                  <td className="p-3 text-right">{pct(r.sales, r.visitors)}</td>
                  <td className="p-3 text-right">{formatCop(r.revenue)}</td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-foreground/50">Todavía no hay datos en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground/50">
          La fuente es la del primer link con UTM que abrió la persona (si luego entra por otro link con UTM, se actualiza).
          Las compras que llegan sin pasar por la página cuentan como «Directo».
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-xl">Botones con más clics</h2>
          <ul className="rounded-2xl border border-gold-light/60 bg-white text-sm">
            {[...byButton.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([k, n]) => (
                <li key={k} className="flex justify-between border-t border-gold-light/40 p-3 first:border-t-0">
                  <span>{k}</span>
                  <span className="font-medium">{n}</span>
                </li>
              ))}
            {byButton.size === 0 && <li className="p-3 text-foreground/50">Sin clics registrados todavía.</li>}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-xl">Últimos pagos</h2>
          <ul className="rounded-2xl border border-gold-light/60 bg-white text-sm">
            {orders
              .filter((o) => o.status !== "pending")
              .slice(0, 12)
              .map((o) => (
                <li key={o.id} className="flex justify-between gap-3 border-t border-gold-light/40 p-3 first:border-t-0">
                  <span className="text-foreground/60">{formatDate(o.created_at)}</span>
                  <span>{o.origin || "Directo"}</span>
                  <span className={o.status === "approved" ? "text-emerald-700" : "text-rose-700"}>
                    {o.status === "approved" ? formatCop(o.amount_cents) : "Rechazado"}
                  </span>
                </li>
              ))}
            {orders.every((o) => o.status === "pending") && <li className="p-3 text-foreground/50">Sin pagos en este periodo.</li>}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl">Links oficiales por canal</h2>
        <p className="text-sm text-foreground/60">
          Usa siempre el link de cada canal para que las ventas se atribuyan bien. El QR de la masterclass ya lleva el suyo.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {UTM_LINKS.map((l) => (
            <li key={l.channel} className="rounded-xl border border-gold-light/60 bg-white p-3">
              <p className="font-medium">{l.channel}</p>
              <p className="break-all font-mono text-xs text-foreground/70 select-all">{l.url}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
