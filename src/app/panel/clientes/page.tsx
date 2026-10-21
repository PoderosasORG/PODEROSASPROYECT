import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: creator } = await supabase.from("creators").select("id, slug, display_name").eq("id", user.id).maybeSingle();
  if (!creator) redirect("/panel");

  // Individual: solo las ventas de ESTA creadora — nadie más las ve.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, buyer_name, buyer_email, buyer_id, amount_cents, currency, status, created_at, products(title)")
    .eq("creator_id", creator.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Para compras con cuenta (buyer_id), el nombre/correo vive en profiles,
  // no en la orden (que solo los guarda para compras de invitado).
  const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id).filter((id): id is string => !!id))];
  const admin = createAdminClient();
  const { data: profiles } = buyerIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", buyerIds)
    : { data: [] };
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows = (orders ?? []).map((o) => {
    const product = Array.isArray(o.products) ? o.products[0] : o.products;
    return {
      id: o.id,
      name: o.buyer_name ?? (o.buyer_id ? profileNames.get(o.buyer_id) : null) ?? "—",
      email: o.buyer_email ?? "—",
      product: product?.title ?? "—",
      amount: formatPrice(o.amount_cents, o.currency),
      date: formatDate(o.created_at),
    };
  });

  const totalRevenue = (orders ?? []).reduce((sum, o) => sum + o.amount_cents, 0);
  const uniqueCustomers = new Set((orders ?? []).map((o) => o.buyer_email ?? o.buyer_id)).size;

  // Colectivo: números generales de TODA la plataforma, sin desglosar
  // cuánto vendió cada una (eso es privado de cada quien).
  const { count: platformCustomers } = await admin
    .from("orders")
    .select("buyer_email", { count: "exact", head: true })
    .eq("status", "approved");
  const { data: eventOrders } = await admin
    .from("orders")
    .select("id, products!inner(type)")
    .eq("status", "approved")
    .eq("products.type", "event");

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <h1 className="font-serif text-3xl">Mis clientes</h1>
        <Link href="/panel" className="text-sm text-gold hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gold-light/60 p-5">
          <p className="text-xs text-foreground/50 uppercase tracking-wide">Ingresos totales</p>
          <p className="font-serif text-2xl mt-1">{formatPrice(totalRevenue, "COP")}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gold-light/60 p-5">
          <p className="text-xs text-foreground/50 uppercase tracking-wide">Clientes únicos</p>
          <p className="font-serif text-2xl mt-1">{uniqueCustomers}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gold-light/60 p-5">
          <p className="text-xs text-foreground/50 uppercase tracking-wide">Ventas</p>
          <p className="font-serif text-2xl mt-1">{orders?.length ?? 0}</p>
        </div>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl border border-gold-light/60 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-foreground/60">Todavía no tienes ventas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-beige-light text-left text-xs uppercase tracking-wide text-foreground/50">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gold-light/30">
                  <td className="p-3">
                    <div>{r.name}</div>
                    <div className="text-xs text-foreground/50">{r.email}</div>
                  </td>
                  <td className="p-3">{r.product}</td>
                  <td className="p-3">{r.amount}</td>
                  <td className="p-3">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="font-serif text-xl mb-3">Poderosas en conjunto</h2>
        <p className="text-xs text-foreground/50 mb-3">
          Números generales de toda la plataforma — no muestra cuánto vendió cada una, solo el total del proyecto.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gold-light/60 p-5">
            <p className="text-xs text-foreground/50 uppercase tracking-wide">Clientes de Poderosas (todas)</p>
            <p className="font-serif text-2xl mt-1">{platformCustomers ?? 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gold-light/60 p-5">
            <p className="text-xs text-foreground/50 uppercase tracking-wide">Boletas vendidas del evento</p>
            <p className="font-serif text-2xl mt-1">{eventOrders?.length ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
