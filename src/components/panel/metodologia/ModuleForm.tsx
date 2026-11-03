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
  const [supportFileDisplayName, setSupportFileDisplayName] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bunnyVideoId, setBunnyVideoId] = useState(existing?.bunny_video_id ?? null);
  const [savedModuleId, setSavedModuleId] = useState(existing?.id ?? null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [videoJustUploaded, setVideoJustUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"draft" | "publish" | null>(null);

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
    setSavingAction(publish ? "publish" : "draft");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión inválida, recarga la página.");
        setSaving(false);
        setSavingAction(null);
        return;
      }

      let videoId = bunnyVideoId;
      if (videoFile) {
        setUploadProgress(0);
        setVideoJustUploaded(false);
        videoId = await uploadVideoToBunny(videoFile);
        setBunnyVideoId(videoId);
        setUploadProgress(null);
        setVideoFile(null);
        setVideoJustUploaded(true);
      }
      if (!videoId) {
        setError("Elige un video antes de guardar.");
        setSaving(false);
        setSavingAction(null);
        return;
      }

      let customThumbnailUrl = existing?.custom_thumbnail_url ?? null;
      if (thumbnailFile) {
        const path = `${user.id}/metodologia/${categoryId}/${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage.from("covers").upload(path, thumbnailFile);
        if (thumbError) throw thumbError;
        customThumbnailUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;

        // Guardamos la URL en nuestra base, pero el video en sí lo reproduce
        // Bunny — sin esto, la miniatura que sube la administradora nunca
        // se ve, Bunny sigue mostrando la que generó automáticamente.
        const thumbRes = await fetch("/api/panel/metodologia/thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, videoId, thumbnailUrl: customThumbnailUrl }),
        });
        if (!thumbRes.ok) {
          const thumbBody = await thumbRes.json().catch(() => ({ error: "Error desconocido" }));
          throw new Error(thumbBody.error ?? "No se pudo fijar la miniatura en Bunny");
        }
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

      const { data: savedModule, error: saveError } = savedModuleId
        ? await supabase.from("category_modules").update(row).eq("id", savedModuleId).select().single()
        : await supabase.from("category_modules").insert(row).select().single();

      if (saveError) throw saveError;
      setSavedModuleId(savedModule.id);

      if (hasSupportMaterial && supportFile) {
        const filePath = `${user.id}/metodologia/${savedModule.id}/${Date.now()}-${supportFile.name}`;
        const { error: uploadError } = await supabase.storage.from("product-files").upload(filePath, supportFile);
        if (uploadError) throw uploadError;
        const { error: fileRowError } = await supabase.from("category_module_files").insert({
          module_id: savedModule.id,
          file_path: filePath,
          file_name: supportFile.name,
          display_name: supportFileDisplayName.trim() || null,
        });
        if (fileRowError) throw fileRowError;
      }

      onDone(savedModule as CategoryModule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el módulo.");
      setUploadProgress(null);
    } finally {
      setSaving(false);
      setSavingAction(null);
    }
  }

  const fileInputClass =
    "rounded-lg border border-gold-light/60 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border file:border-gold file:bg-white file:px-3 file:py-1.5 file:text-gold file:text-xs file:font-medium file:cursor-pointer hover:file:bg-gold hover:file:text-white file:transition-colors";

  return (
    <div className="w-full max-w-lg flex flex-col gap-5">
      <h2 className="font-serif text-xl">{existing ? "Editar módulo" : "Cargar material"}</h2>

      <section className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-4">
        <h3 className="text-xs uppercase tracking-wide text-gold font-medium">1. Información del módulo</h3>
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-gold-light/60 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-gold-light/60 px-3 py-2"
            rows={3}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm w-28">
          Orden (0 = primero)
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            className="rounded-lg border border-gold-light/60 px-3 py-2"
          />
        </label>
      </section>

      <section className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-4">
        <h3 className="text-xs uppercase tracking-wide text-gold font-medium">2. Video</h3>
        <label className="flex flex-col gap-1 text-sm">
          {bunnyVideoId ? "Reemplazar video (opcional)" : "Video"}
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className={fileInputClass}
          />
        </label>
        {uploadProgress !== null && (
          <p className="text-xs text-foreground/60">Subiendo video: {uploadProgress}%</p>
        )}
        {videoJustUploaded && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ El video ya se subió correctamente. Guarda abajo para confirmarlo, y después puedes usar
            &quot;Vista previa&quot; para verlo tal como lo verá quien compre el curso.
          </p>
        )}
        {!videoJustUploaded && bunnyVideoId && (
          <p className="text-xs text-foreground/50">
            Ya tienes un video guardado para este módulo. {savedModuleId && (
              <a
                href={`/panel/metodologia-poderosa/${savedModuleId}/vista-previa`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                Ver vista previa
              </a>
            )}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Miniatura personalizada (opcional — si no eliges una, Bunny usa un fotograma automático)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
            className={fileInputClass}
          />
        </label>
      </section>

      <section className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-wide text-gold font-medium">3. Material de apoyo</h3>
        <fieldset className="flex flex-col gap-3 text-sm">
          <legend className="sr-only">¿Tiene material de apoyo?</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={hasSupportMaterial} onChange={() => setHasSupportMaterial(true)} />
              Sí
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={!hasSupportMaterial} onChange={() => setHasSupportMaterial(false)} />
              No
            </label>
          </div>
          {hasSupportMaterial && (
            <div className="flex flex-col gap-3 bg-beige-light/60 rounded-xl p-3">
              <input
                type="file"
                onChange={(e) => setSupportFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              <label className="flex flex-col gap-1 text-xs text-foreground/70">
                Nombre que verán las usuarias (opcional — si lo dejas vacío, se usa el nombre del archivo tal cual)
                <input
                  type="text"
                  value={supportFileDisplayName}
                  onChange={(e) => setSupportFileDisplayName(e.target.value)}
                  placeholder="Ej: Cartilla de ejercicios"
                  className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm text-foreground bg-white"
                />
              </label>
            </div>
          )}
        </fieldset>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="rounded-full border border-gold px-5 py-2 text-gold text-sm hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
        >
          {savingAction === "draft" ? "Guardando..." : "Guardar como borrador"}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          {savingAction === "publish" ? "Publicando..." : "Publicar"}
        </button>
        <button onClick={onCancel} disabled={saving} className="text-sm text-foreground/60 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
