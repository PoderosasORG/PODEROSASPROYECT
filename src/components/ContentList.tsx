"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_published: boolean;
  cover_image_url: string | null;
  content_type: string | null;
  order_index: number;
};

export function ContentList({
  products,
  creatorSlug,
}: {
  products: Product[];
  creatorSlug: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    const reordered = [...products];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setBusyId(products[index].id);
    const supabase = createClient();
    await Promise.all(
      reordered.map((product, i) =>
        supabase.from("products").update({ order_index: i }).eq("id", product.id),
      ),
    );
    setBusyId(null);
    router.refresh();
  }

  async function togglePublish(product: Product) {
    setBusyId(product.id);
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ is_published: !product.is_published })
      .eq("id", product.id);
    setBusyId(null);
    router.refresh();
  }

  async function handleDelete(product: Product) {
    if (!confirm(`¿Borrar "${product.title}"? Esto no se puede deshacer.`)) return;
    setBusyId(product.id);
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    setBusyId(null);
    router.refresh();
  }

  if (products.length === 0) {
    return (
      <p className="text-foreground/60 text-sm">
        Aún no has subido nada. Usa &ldquo;+ Subir nuevo&rdquo; para empezar.
      </p>
    );
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="bg-white rounded-2xl border border-gold-light/60 p-5 flex items-center gap-4"
        >
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0 || busyId === product.id}
              className="h-6 w-6 rounded-full border border-gold-light/60 text-xs disabled:opacity-30"
              aria-label="Subir"
            >
              ↑
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === products.length - 1 || busyId === product.id}
              className="h-6 w-6 rounded-full border border-gold-light/60 text-xs disabled:opacity-30"
              aria-label="Bajar"
            >
              ↓
            </button>
          </div>

          <div className="h-16 w-16 rounded-xl bg-beige-light flex items-center justify-center overflow-hidden shrink-0">
            {product.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.cover_image_url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-foreground/40">Sin imagen</span>
            )}
          </div>

          <div className="flex-1">
            <p className="font-medium">{product.title}</p>
            <p className="text-sm text-foreground/60">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: product.currency,
                maximumFractionDigits: 0,
              }).format(product.price_cents / 100)}
            </p>
            <span
              className={`inline-block mt-1 text-xs rounded-full px-2 py-0.5 ${
                product.is_published
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {product.is_published ? "Publicado" : "Borrador"}
            </span>
            {product.is_published && (
              <a
                href={`/${creatorSlug}`}
                className="block text-xs text-gold hover:underline mt-1"
              >
                Ver en poderosas.org/{creatorSlug}
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={() => togglePublish(product)}
              disabled={busyId === product.id}
              className="rounded-full bg-gold px-4 py-1.5 text-xs text-white hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
            >
              {product.is_published ? "Despublicar" : "Publicar"}
            </button>
            <button
              onClick={() => handleDelete(product)}
              disabled={busyId === product.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
