"use client";

import { useState } from "react";
import { FieldLabel, type CustomFieldRender } from "@puckeditor/core";
import { createClient } from "@/lib/supabase/client";

export function ImageUploadFieldRender({
  value,
  onChange,
  id,
  label,
}: Parameters<CustomFieldRender<string>>[0] & { label: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <FieldLabel label={label} el="label">
      <div className="flex flex-col gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-24 object-cover rounded" />
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-xs"
        />
        {uploading && <p className="text-xs text-foreground/50">Subiendo...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </FieldLabel>
  );
}
