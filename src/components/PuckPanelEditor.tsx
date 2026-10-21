"use client";

import { useState } from "react";
import Link from "next/link";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { puckConfig } from "@/lib/puck/config";

const EMPTY_DATA: Data = { content: [], root: {} };

export function PuckPanelEditor({
  slug,
  initialData,
}: {
  slug: string;
  initialData: Data | null;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handlePublish(data: Data) {
    setSaveError(null);
    try {
      const res = await fetch("/api/panel/personalizar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puckData: data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "No se pudo guardar.");
      }
    } catch {
      setSaveError("No se pudo conectar con el servidor.");
    }
  }

  return (
    <>
      {/* Puck es el único hijo de un contenedor de altura fija: no lo
          anidamos dentro de más divs con flex/posicionamiento alrededor
          (issue conocido: github.com/puckeditor/puck/issues/1717). El
          header/footer van encima como overlays, fuera de su jerarquía
          de layout. */}
      <div className="h-dvh">
        <Puck
          config={puckConfig}
          data={initialData ?? EMPTY_DATA}
          onPublish={handlePublish}
          viewports={[
            { width: 390, height: "auto", label: "Móvil" },
            { width: 1280, height: "auto", label: "Escritorio" },
          ]}
        />
      </div>

      <div className="fixed top-3 left-4 z-50 pointer-events-none flex gap-2">
        <Link
          href="/panel"
          className="pointer-events-auto text-xs bg-white/90 rounded-full px-3 py-1 shadow text-gold hover:underline"
        >
          ← Volver
        </Link>
        <Link
          href={`/${slug}`}
          target="_blank"
          className="pointer-events-auto text-xs bg-white/90 rounded-full px-3 py-1 shadow text-gold hover:underline"
        >
          Ver mi perfil público ↗
        </Link>
      </div>

      {saveError && (
        <p className="fixed bottom-2 left-4 z-50 bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded shadow">
          {saveError}
        </p>
      )}
    </>
  );
}
