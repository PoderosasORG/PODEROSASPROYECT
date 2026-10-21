"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function VideoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value && <video src={value} controls className="w-full rounded" />}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-gold text-gold text-xs px-4 py-1.5 hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : value ? "Cambiar video" : "Subir video desde galería"}
        </button>
        <span className="text-[11px] text-foreground/40">o pega un link abajo</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... (YouTube, Vimeo, mp4)"
        className="w-full rounded border px-3 py-2 text-sm"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
