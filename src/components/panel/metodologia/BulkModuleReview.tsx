// src/components/panel/metodologia/BulkModuleReview.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";

type Draft = CategoryModule & { include: boolean };

type Props = {
  modules: CategoryModule[];
  onDone: (updated: CategoryModule[]) => void;
};

// Después de la carga masiva, cada video recién subido queda aquí como
// tarjeta independiente: la creadora completa título/descripción a su
// ritmo, y decide con el check cuáles entran en la publicación conjunta.
export function BulkModuleReview({ modules, onDone }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(
    modules.map((m) => ({ ...m, include: true })),
  );
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handlePublishAll() {
    setPublishing(true);
    setError(null);
    const supabase = createClient();
    const toPublish = drafts.filter((d) => d.include);

    for (const draft of toPublish) {
      const { error: updateError } = await supabase
        .from("category_modules")
        .update({
          title: draft.title.trim() || draft.title,
          description: draft.description?.trim() || null,
          is_published: true,
        })
        .eq("id", draft.id);
      if (updateError) {
        setError(`No se pudo publicar "${draft.title}": ${updateError.message}`);
        setPublishing(false);
        return;
      }
    }

    setPublishing(false);
    onDone(
      drafts.map((d) => ({
        id: d.id,
        category_id: d.category_id,
        title: d.title,
        description: d.description,
        bunny_video_id: d.bunny_video_id,
        custom_thumbnail_url: d.custom_thumbnail_url,
        order_index: d.order_index,
        is_published: d.include ? true : d.is_published,
      })),
    );
  }

  async function handleSaveDraft(draft: Draft) {
    const supabase = createClient();
    await supabase
      .from("category_modules")
      .update({
        title: draft.title.trim() || draft.title,
        description: draft.description?.trim() || null,
      })
      .eq("id", draft.id);
  }

  const includedCount = drafts.filter((d) => d.include).length;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl">Completa la información de cada video</h2>
        <p className="text-sm text-foreground/60 mt-1">
          Ya están subidos como borrador. Ponle título y descripción a cada uno, quita el check de
          los que todavía no quieras publicar, y al final publica todos de una vez.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="bg-white rounded-2xl border border-gold-light/60 p-4 flex gap-3"
          >
            <div className="shrink-0 w-20 h-14 rounded-lg bg-beige-light flex items-center justify-center text-gold text-2xl">
              🎬
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <input
                value={draft.title}
                onChange={(e) => update(draft.id, { title: e.target.value })}
                onBlur={() => handleSaveDraft(draft)}
                placeholder="Título del módulo"
                className="rounded-lg border border-gold-light/60 px-3 py-1.5 text-sm font-medium"
              />
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => update(draft.id, { description: e.target.value })}
                onBlur={() => handleSaveDraft(draft)}
                placeholder="Descripción (opcional)"
                rows={2}
                className="rounded-lg border border-gold-light/60 px-3 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-xs text-foreground/60">
                <input
                  type="checkbox"
                  checked={draft.include}
                  onChange={(e) => update(draft.id, { include: e.target.checked })}
                />
                Incluir en la publicación
              </label>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handlePublishAll}
        disabled={publishing || includedCount === 0}
        className="self-start rounded-full bg-gold px-6 py-3 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
      >
        {publishing
          ? "Publicando..."
          : `Publicar ${includedCount} video${includedCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
