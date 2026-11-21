import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addContact } from "./actions";
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
      personType: "compradora",
      subtype: "",
      orderIds: list.map((o) => o.id),
      contactId: null,
    };
  });
}

type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  contact_type: "invitada_especial" | "equipo";
  subtype: string | null;
  event_name: string | null;
  created_at: string;
};

function contactToCustomer(c: Contact): Customer {
  return {
    key: `contact-${c.id}`,
    name: c.full_name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: "",
    city: c.city ?? "",
    country: c.country ?? "",
    origin: "",
    payment: c.contact_type === "equipo" ? "Equipo (sin costo)" : "Invitada (sin costo)",
    coupon: "",
    firstDate: c.created_at,
    lastDate: c.created_at,
    count: 0,
    total: 0,
    products: c.event_name ? [c.event_name] : [],
    accounts: [],
    isTest: false,
    personType: c.contact_type,
    subtype: c.subtype ?? "",
    orderIds: [],
    contactId: c.id,
  };
}

const input = "rounded-lg border border-gold-light/70 bg-white px-3 py-1.5 text-sm w-full";
const label = "flex flex-col gap-1 text-xs text-foreground/60";

export default async function AdminCrmPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [orders, { data: contacts }, { data: events }] = await Promise.all([
    loadApprovedOrders(),
    admin.from("admin_contacts").select("*").order("created_at"),
    admin.from("products").select("title").eq("type", "event").order("created_at", { ascending: false }),
  ]);
  const buyers = buildCustomers(orders);
  const people = [...buyers, ...((contacts ?? []) as Contact[]).map(contactToCustomer)];
  const realBuyers = buyers.filter((c) => !c.isTest);
  const recurring = realBuyers.filter((c) => c.count > 1).length;
  const guests = (contacts ?? []).filter((c) => c.contact_type === "invitada_especial").length;
  const team = (contacts ?? []).filter((c) => c.contact_type === "equipo").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl">CRM</h1>
        <p className="text-sm text-foreground/60">
          {realBuyers.length} compradoras ({recurring} han comprado más de una vez) · {guests} invitadas especiales · {team}{" "}
          del equipo · filtra cada columna y haz clic en un título para ordenar
        </p>
      </div>

      <CrmTable customers={people} />

      <details className="rounded-2xl border border-gold-light/60 bg-white p-5">
        <summary className="cursor-pointer font-medium">+ Agregar invitada especial o persona del equipo (sin costo)</summary>
        <form action={addContact} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className={`${label} sm:col-span-2`}>Nombre completo *<input name="full_name" required className={input} /></label>
          <label className={label}>Tipo
            <select name="contact_type" className={input} defaultValue="invitada_especial">
              <option value="invitada_especial">Invitada especial</option>
              <option value="equipo">Equipo PODEROSAS</option>
            </select>
          </label>
          <label className={label}>Detalle<input name="subtype" className={input} placeholder="Influencer, fotógrafo…" /></label>
          <label className={label}>Celular / WhatsApp<input name="phone" inputMode="tel" className={input} placeholder="3001234567" /></label>
          <label className={label}>Correo<input name="email" type="email" className={input} /></label>
          <label className={label}>Ciudad<input name="city" defaultValue="Bogotá" className={input} /></label>
          <label className={label}>País<input name="country" defaultValue="Colombia" className={input} /></label>
          <label className={`${label} sm:col-span-2`}>Evento
            <select name="event_name" className={input} defaultValue={events?.[0]?.title ?? ""}>
              <option value="">— Ninguno —</option>
              {(events ?? []).map((e) => <option key={e.title} value={e.title}>{e.title}</option>)}
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>Notas<input name="notes" className={input} /></label>
          <p className="sm:col-span-4 text-[11px] text-foreground/45">El celular se guarda con +57 si escribes solo los 10 dígitos.</p>
          <button className="sm:col-span-4 justify-self-start rounded-full bg-gold text-white px-5 py-2 text-sm">Agregar</button>
        </form>
      </details>

      <p className="text-xs text-foreground/50">
        Teléfono, dirección, origen y método de pago se guardan solos en las compras nuevas (desde el 20 de nov. de 2026).
        Para completar los datos de alguien, usa «Editar» en su fila.
      </p>
    </div>
  );
}
