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

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="max-w-sm text-center">
        <h1 className="font-serif text-3xl">{product.title}</h1>
        {product.description && (
          <p className="mt-2 text-sm text-foreground/70">{product.description}</p>
        )}
        <p className="mt-4 text-lg font-medium">{price}</p>
      </div>
      <EventTicketForm productId={product.id} />
    </div>
  );
}
