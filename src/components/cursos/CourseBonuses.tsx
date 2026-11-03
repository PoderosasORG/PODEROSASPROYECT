"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BonusFile = { id: string; file_name: string; display_name: string | null };

export function CourseBonuses({ productId }: { productId: string }) {
  const [files, setFiles] = useState<BonusFile[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("product_files")
      .select("id, file_name, display_name")
      .eq("product_id", productId)
      .order("order_index")
      .then(({ data }) => setFiles(data ?? []));
  }, [productId]);

  async function download(file: BonusFile) {
    setLoadingId(file.id);
    setError(null);
    try {
      const res = await fetch("/api/mis-compras/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "file", id: file.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo descargar el archivo.");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoadingId(null);
    }
  }

  if (files.length === 0) return null;

  return (
    <div className="p-4 border-t border-gold-light/40">
      <h3 className="text-sm font-medium text-gold mb-2">Bonos de tu compra</h3>
      <div className="flex flex-col gap-1.5">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => download(file)}
            disabled={loadingId === file.id}
            className="text-left text-sm px-2 py-1.5 rounded hover:bg-beige-light disabled:opacity-50"
          >
            {loadingId === file.id ? "Cargando..." : `⬇ ${file.display_name || file.file_name}`}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
