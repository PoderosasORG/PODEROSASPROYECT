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
      .select("id, module_id, file_path, file_name, display_name")
      .eq("module_id", module.id)
      .then(({ data }) => setFiles(data ?? []));
  }, [module.id]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <h1 className="font-serif text-2xl">{module.title}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !playbackUrl && <p className="text-sm text-foreground/60">Cargando video...</p>}
      {playbackUrl && (
        <div className="aspect-video w-full rounded-2xl border border-gold-light/60 shadow-md overflow-hidden bg-black">
          <iframe
            src={playbackUrl}
            loading="lazy"
            className="w-full h-full"
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
  // Pasa por nuestra propia API (no un link directo a Supabase) para que la
  // descarga funcione también en celular — ver el comentario en esa ruta.
  return (
    <a
      href={`/api/metodologia-poderosa/files/${file.id}/download`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-gold hover:underline"
    >
      Descargar: {file.display_name || file.file_name}
    </a>
  );
}
