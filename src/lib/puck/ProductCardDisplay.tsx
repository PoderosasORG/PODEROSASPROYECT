"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProductSummary = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  cover_image_url: string | null;
};

function formatPrice(p: Pick<ProductSummary, "price_cents" | "currency">) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.price_cents / 100);
}

// Muestra la tarjeta real de un producto (portada, título, precio),
// consultando la base de datos directo desde el navegador con la llave
// anónima — funciona igual dentro del editor (como vista previa) que en
// la página pública, porque "products_select_published" ya deja leer
// cualquier producto publicado sin necesidad de sesión.
export function ProductCardDisplay({ productId, accentColor }: { productId: string; accentColor?: string }) {
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, title, price_cents, currency, cover_image_url")
      .eq("id", productId)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) {
    return (
      <div className="w-full rounded-2xl bg-black/5 p-4 text-sm text-foreground/40">
        Elige un producto publicado
      </div>
    );
  }

  if (loading) {
    return <div className="w-full rounded-2xl bg-black/5 p-4 text-sm text-foreground/40">Cargando...</div>;
  }

  if (!product) {
    return (
      <div className="w-full rounded-2xl bg-black/5 p-4 text-sm text-foreground/40">
        Ese producto ya no está disponible.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: accentColor }}>
      {product.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.cover_image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.title}</p>
        <p className="text-xs text-foreground/60">{formatPrice(product)}</p>
      </div>
    </div>
  );
}
