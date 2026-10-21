"use client";

import { ImageFocusUpload } from "@/components/panel/ImageFocusUpload";
import { VideoUpload } from "@/components/panel/VideoUpload";
import { RichTextEditor } from "@/components/panel/RichTextEditor";
import { type ContentBlock, DEFAULT_IMAGE_FOCUS, ALIGN_OPTIONS } from "@/lib/panel/types";

function AlignPicker({ value, onChange }: { value: "left" | "center" | "right"; onChange: (v: "left" | "center" | "right") => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-foreground/50 mr-1">Posición:</span>
      {ALIGN_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded border px-2 py-1 text-xs ${value === opt.value ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function newBlock(type: ContentBlock["type"]): ContentBlock {
  const id = crypto.randomUUID();
  if (type === "text") return { id, type: "text", html: "" };
  if (type === "image") return { id, type: "image", image: DEFAULT_IMAGE_FOCUS, alt: "", align: "center" };
  return { id, type: "video", url: "", align: "center" };
}

export function ContentBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  function update(id: string, patch: Partial<ContentBlock>) {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b)));
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }
  function add(type: ContentBlock["type"]) {
    onChange([...blocks, newBlock(type)]);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Contenido extra (opcional)</p>

      {blocks.map((block, i) => (
        <div key={block.id} className="rounded-lg border p-3 flex flex-col gap-2 bg-white/60">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-foreground/50">
              {block.type === "text" ? "Texto" : block.type === "image" ? "Imagen" : "Video"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(block.id, -1)}
                disabled={i === 0}
                className="h-6 w-6 rounded border text-xs disabled:opacity-30"
                aria-label="Subir"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(block.id, 1)}
                disabled={i === blocks.length - 1}
                className="h-6 w-6 rounded border text-xs disabled:opacity-30"
                aria-label="Bajar"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(block.id)}
                className="h-6 w-6 rounded border text-xs text-red-600"
                aria-label="Quitar"
              >
                ✕
              </button>
            </div>
          </div>

          {block.type === "text" && (
            <RichTextEditor value={block.html} onChange={(html) => update(block.id, { html })} />
          )}

          {block.type === "image" && (
            <>
              <ImageFocusUpload
                label=""
                value={block.image}
                onChange={(image) => update(block.id, { image })}
              />
              <AlignPicker value={block.align} onChange={(align) => update(block.id, { align })} />
            </>
          )}

          {block.type === "video" && (
            <>
              <VideoUpload value={block.url} onChange={(url) => update(block.id, { url })} />
              <AlignPicker value={block.align} onChange={(align) => update(block.id, { align })} />
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={() => add("text")} className="rounded-full border px-4 py-1.5 text-xs hover:bg-gold-light/30">
          + Texto
        </button>
        <button type="button" onClick={() => add("image")} className="rounded-full border px-4 py-1.5 text-xs hover:bg-gold-light/30">
          + Imagen
        </button>
        <button type="button" onClick={() => add("video")} className="rounded-full border px-4 py-1.5 text-xs hover:bg-gold-light/30">
          + Video
        </button>
      </div>
    </div>
  );
}
