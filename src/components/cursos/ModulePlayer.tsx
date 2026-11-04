// src/components/cursos/ModulePlayer.tsx
"use client";

import { useEffect, useState } from "react";
import type { CategoryModule, CategoryModuleFile } from "@/lib/metodologiaPoderosa";
import { createClient } from "@/lib/supabase/client";
import { ModuleQA } from "./ModuleQA";

type PlayableModule = Pick<CategoryModule, "id" | "title" | "description">;

export function ModulePlayer({
  module,
  isComplete = false,
  onToggleComplete,
  showProgress = true,
}: {
  module: PlayableModule;
  isComplete?: boolean;
  onToggleComplete?: (isComplete: boolean) => void;
  // false en la vista previa de la creadora: ahí no hay progreso que marcar.
  showProgress?: boolean;
}) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<CategoryModuleFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  async function toggleComplete() {
    const next = !isComplete;
    setSavingProgress(true);
    try {
      await fetch(`/api/metodologia-poderosa/${module.id}/progress`, {
        method: next ? "POST" : "DELETE",
      });
      onToggleComplete?.(next);
    } finally {
      setSavingProgress(false);
    }
  }

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">{module.title}</h1>
        {showProgress && (
          <button
            onClick={toggleComplete}
            disabled={savingProgress}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isComplete
                ? "bg-gold-light/40 text-foreground hover:bg-gold-light/60"
                : "bg-gold text-white hover:bg-gold-light hover:text-foreground"
            }`}
          >
            {isComplete ? "✓ Marcar como incompleto" : "Marcar como finalizado"}
          </button>
        )}
      </div>

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

      {files.length > 0 && (
        <div className="flex flex-col gap-2 bg-gold-light/15 border border-gold-light/50 rounded-xl p-4">
          <h2 className="font-serif text-lg">Material de apoyo</h2>
          {files.map((file) => (
            <ModuleFileLink key={file.id} file={file} />
          ))}
        </div>
      )}

      {module.description && <ModuleDescription description={module.description} />}

      <ModuleQA moduleId={module.id} />
    </div>
  );
}

function ModuleDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 220;
  const preview = isLong ? `${description.slice(0, 220).trimEnd()}…` : description;

  return (
    <div className="text-foreground/70">
      <p>{expanded ? description : preview}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-sm text-gold hover:underline mt-1"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
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
