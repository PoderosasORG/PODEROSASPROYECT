"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageFocusUpload } from "@/components/panel/ImageFocusUpload";
import { BioEditor } from "@/components/panel/BioEditor";
import { ThemeEditor } from "@/components/panel/ThemeEditor";
import { ContentBlocksEditor } from "@/components/panel/ContentBlocksEditor";
import {
  type ImageFocus,
  type TextStyle,
  type Theme,
  type ContentBlock,
} from "@/lib/panel/types";

export type PanelData = {
  avatar: ImageFocus;
  cover: ImageFocus;
  bio: string;
  bioStyle: TextStyle;
  theme: Theme;
  blocks: ContentBlock[];
};

export function FixedPanelEditor({ slug, initial }: { slug: string; initial: PanelData }) {
  const [data, setData] = useState<PanelData>(initial);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/panel/personalizar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setSaveMessage("Guardado.");
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveMessage(body.error ?? "No se pudo guardar.");
      }
    } catch {
      setSaveMessage("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-beige-light shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/panel" className="text-sm text-gold hover:underline">
            ← Volver
          </Link>
          <h1 className="font-serif text-lg">Personaliza tu página</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-xs text-foreground/60">{saveMessage}</span>}
          <Link href={`/${slug}`} target="_blank" className="text-xs text-gold hover:underline">
            Ver mi perfil público ↗
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-gold px-5 py-1.5 text-sm text-white hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-xl mx-auto w-full flex flex-col gap-8">
        <ImageFocusUpload label="Foto de perfil" value={data.avatar} onChange={(avatar) => setData({ ...data, avatar })} />
        <ImageFocusUpload label="Foto de portada" value={data.cover} onChange={(cover) => setData({ ...data, cover })} />
        <BioEditor
          bio={data.bio}
          style={data.bioStyle}
          onBioChange={(bio) => setData({ ...data, bio })}
          onStyleChange={(bioStyle) => setData({ ...data, bioStyle })}
        />
        <ThemeEditor theme={data.theme} onChange={(theme) => setData({ ...data, theme })} />
        <ContentBlocksEditor blocks={data.blocks} onChange={(blocks) => setData({ ...data, blocks })} />

        <div className="rounded-lg border border-dashed p-4 text-sm text-foreground/50">
          Tus cursos y contenido publicado aparecen solos en tu página pública — no hace falta agregarlos aquí.
          Súbelos desde &quot;Subir contenido&quot; en tu panel.
        </div>
      </div>
    </div>
  );
}
