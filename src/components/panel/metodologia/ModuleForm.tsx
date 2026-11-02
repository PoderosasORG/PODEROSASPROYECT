// src/components/panel/metodologia/ModuleForm.tsx
"use client";

import { useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";

type Props = {
  categoryId: string;
  existing: CategoryModule | null;
  nextOrderIndex: number;
  onDone: (saved: CategoryModule) => void;
  onCancel: () => void;
};

export function ModuleForm({ categoryId, existing, nextOrderIndex, onDone, onCancel }: Props) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [orderIndex, setOrderIndex] = useState(existing?.order_index ?? nextOrderIndex);
  const [hasSupportMaterial, setHasSupportMaterial] = useState(false);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bunnyVideoId, setBunnyVideoId] = useState(existing?.bunny_video_id ?? null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadVideoToBunny(file: File): Promise<string> {
    const authRes = await fetch("/api/panel/metodologia/upload-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, title: title.trim() || file.name }),
    });
    if (!authRes.ok) {
      const body = await authRes.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(body.error ?? "No se pudo preparar la subida");
    }
    const auth = (await authRes.json()) as {
      videoId: string;
      libraryId: string;
      expire: number;
      signature: string;
    };

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          AuthorizationSignature: auth.signature,
          AuthorizationExpire: String(auth.expire),
          VideoId: auth.videoId,
          LibraryId: auth.libraryId,
        },
        metadata: { filetype: file.type, title: title.trim() || file.name },
        onError: reject,
        onProgress: (sent, total) => setUploadProgress(Math.round((sent / total) * 100)),
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    return auth.videoId;
  }

  async function handleSubmit(publish: boolean) {
    if (!title.trim()) {
      setError("Ponle un título al módulo.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let videoId = bunnyVideoId;
      if (videoFile) {
        setUploadProgress(0);
        videoId = await uploadVideoToBunny(videoFile);
        setBunnyVideoId(videoId);
        setUploadProgress(null);
      }
      if (!videoId) {
        setError("Elige un video antes de guardar.");
        setSaving(false);
        return;
      }

      const supabase = createClient();

      let customThumbnailUrl = existing?.custom_thumbnail_url ?? null;
      if (thumbnailFile) {
        const path = `${categoryId}/${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage.from("covers").upload(path, thumbnailFile);
        if (thumbError) throw thumbError;
        customThumbnailUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      const row = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || null,
        bunny_video_id: videoId,
        custom_thumbnail_url: customThumbnailUrl,
        order_index: orderIndex,
        is_published: publish,
      };

      const { data: savedModule, error: saveError } = existing
        ? await supabase.from("category_modules").update(row).eq("id", existing.id).select().single()
        : await supabase.from("category_modules").insert(row).select().single();

      if (saveError) throw saveError;

      if (hasSupportMaterial && supportFile) {
        const filePath = `${savedModule.id}/${Date.now()}-${supportFile.name}`;
        const { error: uploadError } = await supabase.storage.from("product-files").upload(filePath, supportFile);
        if (uploadError) throw uploadError;
        await supabase.from("category_module_files").insert({
          module_id: savedModule.id,
          file_path: filePath,
          file_name: supportFile.name,
        });
      }

      onDone(savedModule as CategoryModule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el módulo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-4">
      <h2 className="font-serif text-xl">{existing ? "Editar módulo" : "Cargar material"}</h2>

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-3 py-2"
          rows={3}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {bunnyVideoId ? "Reemplazar video (opcional)" : "Video"}
        <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
      </label>
      {uploadProgress !== null && (
        <p className="text-xs text-foreground/60">Subiendo video: {uploadProgress}%</p>
      )}

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">¿Tiene material de apoyo?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={hasSupportMaterial}
              onChange={() => setHasSupportMaterial(true)}
            />
            Sí
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={!hasSupportMaterial}
              onChange={() => setHasSupportMaterial(false)}
            />
            No
          </label>
        </div>
        {hasSupportMaterial && (
          <input
            type="file"
            onChange={(e) => setSupportFile(e.target.files?.[0] ?? null)}
          />
        )}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Orden (0 = primero)
        <input
          type="number"
          min={0}
          value={orderIndex}
          onChange={(e) => setOrderIndex(Number(e.target.value))}
          className="rounded border px-3 py-2 w-24"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Miniatura personalizada (opcional — si no eliges una, se usa un fotograma automático)
        <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="rounded-full border border-gold px-5 py-2 text-gold text-sm hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
        >
          Guardar como borrador
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          Publicar
        </button>
        <button onClick={onCancel} disabled={saving} className="text-sm text-foreground/60 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
