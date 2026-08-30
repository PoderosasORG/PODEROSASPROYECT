"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AvatarUploadField({
  creatorId,
  currentAvatarUrl,
}: {
  creatorId: string;
  currentAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const supabase = createClient();
      const path = `${creatorId}/avatar-${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const avatarUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;

      const { error: updateError } = await supabase
        .from("creators")
        .update({ avatar_url: avatarUrl })
        .eq("id", creatorId);
      if (updateError) throw updateError;

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
      setPreview(currentAvatarUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-white shadow-inner bg-gradient-to-br from-pink-light to-gold-light flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto de perfil" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-foreground/40">Sin foto</span>
        )}
      </div>
      <label className="cursor-pointer rounded-full bg-gold px-6 py-2 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors">
        {uploading ? "Subiendo..." : "Cambiar foto"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
