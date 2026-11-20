import { requireAdmin } from "@/lib/admin/auth";
import { loadApprovedOrders, type AdminOrder } from "@/lib/admin/orders";
import { formatCop, formatDate } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  CARD: "Tarjeta",
  NEQUI: "Nequi",
  PSE: "PSE",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia",
  BANCOLOMBIA_QR: "QR Bancolombia",
  DAVIPLATA: "Daviplata",
  BANCOLOMBIA_COLLECT: "Corresponsal Bancolombia",
};

function paymentLabel(o: AdminOrder) {
  if (o.isDirect) return "Nequi directo";
  if (o.isTest) return "Prueba";
  if (!o.wompi_payment_method) return "Wompi";
  return PAYMENT_LABELS[o.wompi_payment_method] ?? o.wompi_payment_method;
}

type Customer = {
  key: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  origin: string;
  payment: string;
  coupon: string;
  firstDate: string;
  lastDate: string;
  count: number;
  total: number;
  products: string[];
  accounts: string[];
  isTest: boolean;
};

function buildCustomers(orders: AdminOrder[]): Customer[] {
  // orders viene de la más reciente a la más vieja.
  const byKey = new Map<string, AdminOrder[]>();
  for (const o of orders) {
    const key = (o.buyer_email ?? o.buyer_id ?? o.id).toLowerCase();
    byKey.set(key, [...(byKey.get(key) ?? []), o]);
  }
  return [...byKey.entries()].map(([key, list]) => {
    const latest = list[0];
    const pick = (f: (o: AdminOrder) => string | null) => list.map(f).find((v) => v && v.trim()) ?? "";
    return {
      key,
      name: pick((o) => o.buyer_name) || "—",
      email: latest.buyer_email ?? "—",
      phone: pick((o) => o.buyer_phone),
      address: pick((o) => o.buyer_address),
      city: pick((o) => o.buyer_city),
      country: pick((o) => o.buyer_country),
      origin: pick((o) => o.origin),
      payment: paymentLabel(latest),
      coupon: pick((o) => o.coupon_code),
      firstDate: list[list.length - 1].created_at,
      lastDate: latest.created_at,
      count: list.length,
      total: list.reduce((s, o) => s + o.amount_cents, 0),
      products: [...new Set(list.map((o) => o.product_title))],
      accounts: [...new Set(list.map((o) => o.creator_name))],
      isTest: list.every((o) => o.isTest),
    };
  });
}

export default async function AdminCrmPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const term = (q ?? "").trim().toLowerCase();

  const customers = buildCustomers(await loadApprovedOrders()).filter(
    (c) =>
      !term ||
      [c.name, c.email, c.phone, c.city, c.country, c.origin, ...c.products].some((v) => v.toLowerCase().includes(term)),
  );

  const recurring = customers.filter((c) => c.count > 1 && !c.isTest).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">CRM de compradoras</h1>
          <p className="text-sm text-foreground/60">
            {customers.length} personas · {recurring} han comprado más de una vez
          </p>
        </div>
        <form className="flex gap-2 text-sm">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar nombre, correo, ciudad, producto…"
            className="w-64 rounded-full border border-gold-light/70 bg-white px-4 py-1.5"
          />
          <button className="rounded-full bg-foreground text-white px-4 py-1.5">Buscar</button>
        </form>
      </div>

      <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="text-left text-xs text-foreground/50">
            <tr>
              <th className="px-4 py-2">Nombre completo</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Dirección</th>
              <th className="px-3 py-2">Ciudad / País</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Método de pago</th>
              <th className="px-3 py-2">Cupón</th>
              <th className="px-3 py-2">Última compra</th>
              <th className="px-3 py-2 text-right">Compras</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-4 py-2">Qué compró · a qué cuenta</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.key} className={`border-t border-gold-light/40 align-top ${c.isTest ? "opacity-50" : ""}`}>
                <td className="px-4 py-2 font-medium">
                  {c.name}
                  {c.isTest ? <span className="ml-1 text-[10px] text-foreground/50">(prueba)</span> : null}
                </td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">{c.phone || "—"}</td>
                <td className="px-3 py-2">{c.address || "—"}</td>
                <td className="px-3 py-2">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-3 py-2">{c.origin || "—"}</td>
                <td className="px-3 py-2">{c.payment}</td>
                <td className="px-3 py-2">{c.coupon || "No"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(c.lastDate)}</td>
                <td className="px-3 py-2 text-right">{c.count}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{formatCop(c.total)}</td>
                <td className="px-4 py-2 text-xs text-foreground/70">
                  {c.products.join(" · ")}
                  <br />
                  <span className="text-foreground/45">→ {c.accounts.join(", ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 ? <p className="p-5 text-sm text-foreground/60">No hay compradoras que coincidan.</p> : null}
      </div>

      <p className="text-xs text-foreground/50">
        Teléfono, dirección, origen y método de pago se guardan solos en las compras nuevas (desde que se activó este
        panel). Las compras anteriores muestran «—» en esos campos.
      </p>
    </div>
  );
}
