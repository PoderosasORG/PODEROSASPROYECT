import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorProfile } from "@/components/CreatorProfile";
import { normalizeDevicePosition, DEFAULT_THEME, DEFAULT_BIO_STYLE } from "@/lib/panelLayout";

// Siempre trae datos frescos: sin esto, el navegador puede mostrar
// una versión en caché del perfil justo después de guardar cambios.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!creator) {
    notFound();
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("creator_id", creator.id)
    .eq("is_published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: blocks } = await supabase
    .from("panel_blocks")
    .select("*")
    .eq("creator_id", creator.id)
    .order("z_index", { ascending: true });

  const sortedProducts = [...(products ?? [])];
  if (creator.featured_product_id) {
    const idx = sortedProducts.findIndex((p) => p.id === creator.featured_product_id);
    if (idx > 0) {
      const [featured] = sortedProducts.splice(idx, 1);
      sortedProducts.unshift(featured);
    }
  }

  function formatPrice(p: { price_cents: number; currency: string }) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: p.currency,
      maximumFractionDigits: 0,
    }).format(p.price_cents / 100);
  }

  const formattedProducts = sortedProducts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    price: formatPrice(p),
  }));

  const enrichedBlocks = (blocks ?? [])
    .map((block) => {
      if (block.block_type !== "product") return block;
      const product = (products ?? []).find((p) => p.id === block.product_id);
      if (!product) return null;
      return {
        ...block,
        product_title: product.title,
        product_price: formatPrice(product),
        product_cover: product.cover_image_url,
      };
    })
    .filter((b) => b !== null);

  return (
    <CreatorProfile
      slug={creator.slug}
      name={creator.display_name}
      initials={creator.display_name.charAt(0).toUpperCase()}
      role={creator.slug === "kat" ? "Fundadora de Poderosas" : "Poderosa"}
      bio={creator.bio ?? ""}
      avatarUrl={creator.avatar_url}
      avatarSizeMobile={creator.avatar_size_mobile}
      avatarSizeDesktop={creator.avatar_size_desktop}
      avatarPosition={normalizeDevicePosition(creator.avatar_position, {
        mobile: { x: 50, y: 18 },
        desktop: { x: 50, y: 50 },
      })}
      bioPosition={normalizeDevicePosition(creator.bio_position, {
        mobile: { x: 50, y: 40 },
        desktop: { x: 75, y: 50 },
      })}
      bioStyle={creator.bio_style ?? DEFAULT_BIO_STYLE}
      theme={creator.theme ?? DEFAULT_THEME}
      coverUrl={creator.cover_image_url}
      coverOffsetY={creator.cover_offset_y}
      blocks={enrichedBlocks}
      products={formattedProducts}
    />
  );
}
