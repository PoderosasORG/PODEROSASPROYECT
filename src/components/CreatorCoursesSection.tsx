import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { stripHtml } from "@/lib/panel/sanitize";

function formatPrice(p: { price_cents: number; currency: string }) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.price_cents / 100);
}

// Sección fija y automática: se arma sola a partir de los productos
// publicados de la creadora (cursos, contenido digital y físico — no
// incluye "membership" ni "event", que tienen sus propios flujos). No
// se edita a mano — para eso ya existe "Subir contenido" en el panel.
export async function CreatorCoursesSection({ creatorId, slug, accentColor }: { creatorId: string; slug: string; accentColor: string }) {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, description, price_cents, currency, cover_image_url, type, access_tier")
    .eq("creator_id", creatorId)
    .eq("is_published", true)
    .in("type", ["course", "digital", "physical"])
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (!products || products.length === 0) return null;

  return (
    <section id="cursos" className="px-6 py-12 max-w-5xl mx-auto w-full scroll-mt-16">
      <h2 className="font-serif text-2xl mb-6">Cursos y productos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => {
          const badge =
            p.access_tier === "public" || p.access_tier === "registered"
              ? "Gratis"
              : p.access_tier === "subscription"
                ? "Incluido"
                : formatPrice(p);

          return (
            <div
              key={p.id}
              className="group rounded-xl border border-black/10 bg-white overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
            >
              <div className="w-full aspect-[16/10] bg-black/5 overflow-hidden">
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover_image_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
                    Sin portada
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-4 flex-1">
                <h3 className="font-medium leading-snug line-clamp-2">{p.title}</h3>
                {p.description && (
                  <p className="text-sm text-foreground/60 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-3">
                  <span
                    className="text-xs font-medium rounded-full px-2.5 py-1"
                    style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                  >
                    {badge}
                  </span>
                  {p.access_tier === "paid" && <BuyButton productId={p.id} slug={slug} accentColor={accentColor} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Enlaza al perfil de las otras dos creadoras, para que se pueda
// navegar de una a otra sin tener que volver siempre al home.
export async function OtherCreatorsSection({ excludeSlug }: { excludeSlug: string }) {
  const supabase = await createClient();
  const { data: creators } = await supabase
    .from("creators")
    .select("slug, display_name, bio, avatar_url")
    .eq("is_active", true)
    .neq("slug", excludeSlug);

  if (!creators || creators.length === 0) return null;

  return (
    <section id="otras-poderosas" className="px-6 py-12 max-w-5xl mx-auto w-full border-t scroll-mt-16">
      <h2 className="font-serif text-2xl mb-6">Conoce a las otras Poderosas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {creators.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="group flex items-center gap-4 rounded-xl border border-black/10 bg-white p-4 transition-shadow hover:shadow-lg"
          >
            <div className="h-14 w-14 rounded-full bg-black/10 overflow-hidden shrink-0">
              {c.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{c.display_name}</p>
              {c.bio && <p className="text-sm text-foreground/60 line-clamp-1">{stripHtml(c.bio, 80)}</p>}
            </div>
            <span className="text-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        ))}
      </div>
      <Link href="/" className="inline-block mt-6 text-sm text-gold hover:underline">
        ← Volver al inicio
      </Link>
    </section>
  );
}
