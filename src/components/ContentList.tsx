"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function toggleVisible(product: Product) {
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
      {products.map((product, index) =>
        editingId === product.id ? (
          <EditProductForm
            key={product.id}
            product={product}
            onDone={() => {
              setEditingId(null);
              router.refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
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
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {product.is_published ? "Visible en tu página" : "Oculto"}
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
              {product.content_type === "curso" && (
                <Link
                  href={`/panel/contenido/${product.id}/lecciones`}
                  className="rounded-full border border-gold text-gold px-4 py-1.5 text-xs hover:bg-gold hover:text-white transition-colors text-center"
                >
                  Gestionar módulos
                </Link>
              )}
              <button
                onClick={() => setEditingId(product.id)}
                disabled={busyId === product.id}
                className="rounded-full border border-gold text-gold px-4 py-1.5 text-xs hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
              >
                Corregir
              </button>
              <button
                onClick={() => toggleVisible(product)}
                disabled={busyId === product.id}
                className="rounded-full bg-gold px-4 py-1.5 text-xs text-white hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
              >
                {product.is_published ? "Ocultar" : "Mostrar"}
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
        ),
      )}
    </div>
  );
}

function EditProductForm({
  product,
  onDone,
  onCancel,
}: {
  product: Product;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [priceDigits, setPriceDigits] = useState(String(product.price_cents / 100));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError("Ponle un nombre.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("products")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        price_cents: Math.max(0, parseInt(priceDigits || "0", 10)) * 100,
      })
      .eq("id", product.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onDone();
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gold p-5 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Precio ($ COP)
        <input
          type="text"
          inputMode="numeric"
          value={priceDigits}
          onChange={(e) => setPriceDigits(e.target.value.replace(/\D/g, ""))}
          className="rounded border px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} disabled={saving} className="rounded-full border px-4 py-1.5 text-sm">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gold px-5 py-1.5 text-sm text-white hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
