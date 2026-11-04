// src/components/panel/metodologia/BulkModuleUpload.tsx
"use client";

import { useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";

type UploadItem = {
  file: File;
  progress: number;
  status: "esperando" | "subiendo" | "listo" | "error";
  error?: string;
  savedModule?: CategoryModule;
};

type Props = {
  categoryId: string;
  nextOrderIndex: number;
  onCancel: () => void;
  onDone: (savedModules: CategoryModule[]) => void;
};

// Carga varios videos de una — cada uno se sube a Bunny y se guarda de una
// vez como módulo en borrador (título = nombre del archivo), para que la
// creadora después pueda pulir título/descripción una por una sin tener que
// repetir el flujo de subir-guardar-repetir video por video.
export function BulkModuleUpload({ categoryId, nextOrderIndex, onCancel, onDone }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("video/"));
    setItems(files.map((file) => ({ file, progress: 0, status: "esperando" })));
  }

  async function uploadOne(file: File): Promise<string> {
    const title = file.name.replace(/\.[^/.]+$/, "");
    const authRes = await fetch("/api/panel/metodologia/upload-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, title }),
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
        metadata: { filetype: file.type, title },
        onError: reject,
        onProgress: (sent, total) => {
          setItems((prev) =>
            prev.map((it) =>
              it.file === file ? { ...it, progress: Math.round((sent / total) * 100) } : it,
            ),
          );
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    return auth.videoId;
  }

  async function handleStartUpload() {
    setUploading(true);
    const supabase = createClient();
    const saved: CategoryModule[] = [];
    let orderIndex = nextOrderIndex;

    for (const item of items) {
      setItems((prev) =>
        prev.map((it) => (it.file === item.file ? { ...it, status: "subiendo" } : it)),
      );
      try {
        const videoId = await uploadOne(item.file);
        const title = item.file.name.replace(/\.[^/.]+$/, "");
        const { data: savedModule, error } = await supabase
          .from("category_modules")
          .insert({
            category_id: categoryId,
            title,
            description: null,
            bunny_video_id: videoId,
            order_index: orderIndex,
            is_published: false,
          })
          .select()
          .single();
        orderIndex += 1;

        if (error) throw error;
        saved.push(savedModule as CategoryModule);
        setItems((prev) =>
          prev.map((it) =>
            it.file === item.file
              ? { ...it, status: "listo", progress: 100, savedModule: savedModule as CategoryModule }
              : it,
          ),
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it) =>
            it.file === item.file
              ? { ...it, status: "error", error: err instanceof Error ? err.message : "Falló la subida" }
              : it,
          ),
        );
      }
    }

    setUploading(false);
    if (saved.length > 0) onDone(saved);
  }

  const allDone = items.length > 0 && items.every((it) => it.status === "listo" || it.status === "error");

  return (
    <div className="w-full max-w-lg flex flex-col gap-5">
      <h2 className="font-serif text-xl">Carga masiva de videos</h2>
      <p className="text-sm text-foreground/60">
        Elige varios videos a la vez. Se suben todos y quedan como borrador con el nombre del
        archivo como título — después los abres uno por uno para ponerles título, descripción y
        publicarlos, sin tener que repetir el proceso de subida.
      </p>

      {items.length === 0 && (
        <label className="rounded-lg border border-dashed border-gold-light/70 px-4 py-8 text-center text-sm text-foreground/60 cursor-pointer hover:border-gold">
          Elige varios videos de tu computador
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.file.name + item.file.size}
              className="flex flex-col gap-1 bg-white rounded-xl border border-gold-light/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm truncate">{item.file.name}</p>
                <span className="text-xs text-foreground/50 shrink-0">
                  {item.status === "esperando" && "En espera"}
                  {item.status === "subiendo" && `${item.progress}%`}
                  {item.status === "listo" && "✓ Listo"}
                  {item.status === "error" && "✕ Error"}
                </span>
              </div>
              {item.status === "subiendo" && (
                <div className="h-1.5 rounded-full bg-beige-light overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "error" && <p className="text-xs text-red-600">{item.error}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {!uploading && !allDone && items.length > 0 && (
          <button
            onClick={handleStartUpload}
            className="rounded-full bg-gold px-5 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Subir {items.length} video{items.length === 1 ? "" : "s"}
          </button>
        )}
        {uploading && (
          <p className="text-sm text-foreground/60">Subiendo, no cierres esta página...</p>
        )}
        {allDone && (
          <p className="text-sm text-green-700">
            Listo — ya puedes revisar y completar la información de cada video abajo.
          </p>
        )}
        <button onClick={onCancel} disabled={uploading} className="text-sm text-foreground/60 hover:underline">
          {allDone ? "Cerrar" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}
