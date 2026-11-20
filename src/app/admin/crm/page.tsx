import { requireAdmin } from "@/lib/admin/auth";
import { loadApprovedOrders, type AdminOrder } from "@/lib/admin/orders";
import { CrmTable, type Customer } from "./CrmTable";

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

export default async function AdminCrmPage() {
  await requireAdmin();
  const customers = buildCustomers(await loadApprovedOrders());
  const recurring = customers.filter((c) => c.count > 1 && !c.isTest).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl">CRM de compradoras</h1>
        <p className="text-sm text-foreground/60">
          {customers.filter((c) => !c.isTest).length} personas · {recurring} han comprado más de una vez · filtra cada
          columna en la fila de búsqueda y haz clic en un título para ordenar
        </p>
      </div>

      <CrmTable customers={customers} />

      <p className="text-xs text-foreground/50">
        Teléfono, dirección, origen y método de pago se guardan solos en las compras nuevas (desde el 20 de nov. de
        2026). Las compras anteriores muestran «—» en esos campos.
      </p>
    </div>
  );
}
