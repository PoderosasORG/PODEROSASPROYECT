"use client";

import { useState } from "react";
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
    <div className="h-full flex flex-col">
      {saveError && (
        <p className="bg-red-50 text-red-600 text-sm px-4 py-2">{saveError}</p>
      )}
      <div className="flex-1 min-h-0">
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
      <p className="text-xs text-foreground/50 px-4 py-2">
        Perfil público: /{slug}
      </p>
    </div>
  );
}
