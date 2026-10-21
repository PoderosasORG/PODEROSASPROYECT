"use client";

import { useRef, useState } from "react";
import { FieldLabel, type CustomFieldRender } from "@puckeditor/core";
import { createClient } from "@/lib/supabase/client";

export type ImageValue = { url: string; focusX: number; focusY: number };
export const DEFAULT_IMAGE_VALUE: ImageValue = { url: "", focusX: 50, focusY: 50 };

export function ImageUploadFieldRender({
  value,
  onChange,
  id,
  label,
}: Parameters<CustomFieldRender<ImageValue>>[0] & { label: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const safeValue = value?.url !== undefined ? value : DEFAULT_IMAGE_VALUE;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión inválida, recarga la página.");
        return;
      }
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      onChange({ url: data.publicUrl, focusX: 50, focusY: 50 });
    } finally {
      setUploading(false);
    }
  }

  function handlePickFocus(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const focusX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const focusY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange({ ...safeValue, focusX, focusY });
  }

  return (
    <FieldLabel label={label} el="label">
      <div className="flex flex-col gap-2">
        {safeValue.url ? (
          <div
            onClick={handlePickFocus}
            title="Clic para elegir qué parte se ve"
            className="relative w-full h-28 rounded overflow-hidden cursor-crosshair border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeValue.url}
              alt=""
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `${safeValue.focusX}% ${safeValue.focusY}%` }}
            />
            <div
              className="absolute h-3 w-3 rounded-full border-2 border-white bg-gold shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${safeValue.focusX}%`, top: `${safeValue.focusY}%` }}
            />
          </div>
        ) : null}

        {safeValue.url && (
          <p className="text-[11px] text-foreground/50">Clic sobre la foto para elegir qué parte se ve</p>
        )}

        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-gold text-gold text-xs px-4 py-1.5 hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : safeValue.url ? "Cambiar foto" : "Subir foto"}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </FieldLabel>
  );
}
