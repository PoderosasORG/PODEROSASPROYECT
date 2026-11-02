// src/components/cursos/ModulePlayer.tsx
"use client";

import { useEffect, useState } from "react";
import type { CategoryModule, CategoryModuleFile } from "@/lib/metodologiaPoderosa";
import { createClient } from "@/lib/supabase/client";

type PlayableModule = Pick<CategoryModule, "id" | "title" | "description">;

export function ModulePlayer({ module }: { module: PlayableModule }) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<CategoryModuleFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaybackUrl(null);
    setError(null);

    fetch(`/api/metodologia-poderosa/${module.id}/playback`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No tienes acceso a este video.");
        return res.json() as Promise<{ url: string }>;
      })
      .then((data) => setPlaybackUrl(data.url))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el video"));

    const supabase = createClient();
    supabase
      .from("category_module_files")
      .select("id, module_id, file_path, file_name")
      .eq("module_id", module.id)
      .then(({ data }) => setFiles(data ?? []));
  }, [module.id]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <h1 className="font-serif text-2xl">{module.title}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !playbackUrl && <p className="text-sm text-foreground/60">Cargando video...</p>}
      {playbackUrl && (
        <div className="aspect-video w-full">
          <iframe
            src={playbackUrl}
            loading="lazy"
            className="w-full h-full rounded-xl"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {module.description && <p className="text-foreground/70">{module.description}</p>}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg">Material de apoyo</h2>
          {files.map((file) => (
            <ModuleFileLink key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleFileLink({ file }: { file: CategoryModuleFile }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("product-files")
      .createSignedUrl(file.file_path, 60 * 10)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [file.file_path]);

  if (!url) return <p className="text-sm text-foreground/40">{file.file_name} (cargando...)</p>;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-gold hover:underline">
      Descargar: {file.file_name}
    </a>
  );
}
