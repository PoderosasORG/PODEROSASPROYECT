"use client";

import { useEffect, useState } from "react";
import { FieldLabel, type CustomFieldRender } from "@puckeditor/core";
import { ProductCardDisplay } from "@/lib/puck/ProductCardDisplay";

type MyProduct = { id: string; title: string; is_published: boolean };

export function ProductPickerRender({
  value,
  onChange,
  id,
  label,
}: Parameters<CustomFieldRender<string>>[0] & { label: string }) {
  const [products, setProducts] = useState<MyProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/panel/mis-productos")
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []));
  }, []);

  return (
    <FieldLabel label={label} el="label">
      <div className="flex flex-col gap-2">
        <select
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-sm"
        >
          <option value="">— Elige un producto —</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.is_published}>
              {p.title}
              {!p.is_published ? " (sin publicar)" : ""}
            </option>
          ))}
        </select>
        {products?.length === 0 && (
          <p className="text-xs text-foreground/50">
            Todavía no tienes productos — créalos en &quot;Subir contenido&quot;.
          </p>
        )}
        {value && <ProductCardDisplay productId={value} />}
      </div>
    </FieldLabel>
  );
}
