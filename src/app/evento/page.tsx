import { createAdminClient } from "@/lib/supabase/admin";
import { EventTicketForm } from "@/components/EventTicketForm";

export const dynamic = "force-dynamic";

export default async function EventoPage() {
  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, title, description, price_cents, currency, capacity")
    .eq("type", "event")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-serif text-2xl">Todavía no hay un evento publicado</h1>
      </div>
    );
  }

  const price = (product.price_cents / 100).toLocaleString("es-CO", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  });

  const { count: sold } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("status", "approved");

  const cuposLabel = product.capacity
    ? `Quedan ${Math.max(product.capacity - (sold ?? 0), 0)} cupos de ${product.capacity}`
    : sold && sold > 0
      ? `${sold} ${sold === 1 ? "persona ya se unió" : "personas ya se unieron"}`
      : "Cupos limitados";

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16 bg-beige-light">
      <div className="max-w-sm text-center flex flex-col items-center gap-3">
        <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
          Masterclass presencial · Poderosa
        </span>
        <h1 className="font-serif text-3xl">{product.title}</h1>
        {product.description && (
          <p className="text-sm text-foreground/70">{product.description}</p>
        )}
        <div className="mt-2 rounded-2xl bg-white p-6 border border-gold-light/60 flex flex-col items-center gap-1 w-full">
          <p className="text-xs uppercase tracking-wide text-gold font-medium">
            Precio especial · {cuposLabel}
          </p>
          <p className="font-serif text-4xl">{price}</p>
          <p className="text-sm text-foreground/60">
            Precio regular: $120.000 COP · 50% de descuento
          </p>
        </div>
      </div>
      <EventTicketForm productId={product.id} />
    </div>
  );
}
