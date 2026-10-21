import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";

function formatPrice(p: { price_cents: number; currency: string }) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.price_cents / 100);
}

// Sección fija y automática: se arma sola a partir de los productos
// publicados de la creadora (cursos y contenido digital). No se edita
// a mano — para eso ya existe "Subir contenido" en el panel.
export async function CreatorCoursesSection({ creatorId, slug, accentColor }: { creatorId: string; slug: string; accentColor: string }) {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, description, price_cents, currency, cover_image_url, type, access_tier")
    .eq("creator_id", creatorId)
    .eq("is_published", true)
    .in("type", ["course", "digital"])
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (!products || products.length === 0) return null;

  return (
    <section className="px-6 py-10">
      <h2 className="font-serif text-2xl mb-6">Cursos y contenido</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border p-4 flex flex-col gap-2 bg-white/60">
            {p.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image_url} alt="" className="w-full aspect-video rounded-xl object-cover" />
            )}
            <h3 className="font-medium">{p.title}</h3>
            {p.description && <p className="text-sm text-foreground/60 line-clamp-2">{p.description}</p>}
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium">
                {p.access_tier === "public" || p.access_tier === "registered"
                  ? "Gratis"
                  : p.access_tier === "subscription"
                    ? "Incluido en suscripción"
                    : formatPrice(p)}
              </span>
              {p.access_tier === "paid" && <BuyButton productId={p.id} slug={slug} accentColor={accentColor} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
