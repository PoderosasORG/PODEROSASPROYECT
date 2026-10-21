"use client";

import { useState } from "react";

type Lesson = { id: string; title: string; order_index: number; is_free_preview: boolean };
type ProductFile = { id: string; file_name: string; order_index: number };
type Product = {
  id: string;
  title: string;
  type: string;
  cover_image_url: string | null;
  course_lessons: Lesson[];
  product_files: ProductFile[];
};

export function PurchasedContent({ product }: { product: Product }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openSignedUrl(kind: "lesson" | "file", id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch("/api/mis-compras/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir el contenido.");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoadingId(null);
    }
  }

  const lessons = [...product.course_lessons].sort((a, b) => a.order_index - b.order_index);
  const files = [...product.product_files].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="rounded-2xl border border-gold-light/60 bg-white/70 p-6">
      <h2 className="font-serif text-xl mb-4">{product.title}</h2>

      {lessons.length > 0 && (
        <ul className="flex flex-col gap-2 mb-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{lesson.title}</span>
              <button
                onClick={() => openSignedUrl("lesson", lesson.id)}
                disabled={loadingId === lesson.id}
                className="rounded-full border px-4 py-1 text-xs hover:bg-gold-light/30 disabled:opacity-50"
              >
                {loadingId === lesson.id ? "Cargando..." : "Ver"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{file.file_name}</span>
              <button
                onClick={() => openSignedUrl("file", file.id)}
                disabled={loadingId === file.id}
                className="rounded-full border px-4 py-1 text-xs hover:bg-gold-light/30 disabled:opacity-50"
              >
                {loadingId === file.id ? "Cargando..." : "Descargar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lessons.length === 0 && files.length === 0 && (
        <p className="text-sm text-foreground/60">Esta creadora todavía no subió el contenido.</p>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
