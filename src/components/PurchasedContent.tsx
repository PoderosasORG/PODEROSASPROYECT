"use client";

import { useState } from "react";

type Lesson = { id: string; title: string; order_index: number; is_free_preview: boolean };
type ProductFile = { id: string; file_name: string; order_index: number };
type Product = {
  id: string;
  title: string;
  type: string;
  cover_image_url: string | null;
  course_lessons: Lesson[];
  product_files: ProductFile[];
};

export function PurchasedContent({ product }: { product: Product }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingLessonId, setPlayingLessonId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  // Los videos de curso se reproducen dentro de la página (no en una
  // pestaña nueva con el archivo crudo) para que el navegador no les
  // ponga su botón nativo de "Descargar" — un freno real contra el
  // robo casual de un clic, sin tocar la experiencia de ver el video.
  async function playLesson(id: string) {
    if (playingLessonId === id) {
      setPlayingLessonId(null);
      setPlayingUrl(null);
      return;
    }
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch("/api/mis-compras/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "lesson", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir el contenido.");
        return;
      }
      setPlayingLessonId(id);
      setPlayingUrl(data.url);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoadingId(null);
    }
  }

  // Los archivos descargables (ebooks, plantillas) sí están pensados
  // para descargarse — ese comportamiento se mantiene igual.
  async function downloadFile(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch("/api/mis-compras/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "file", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir el contenido.");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoadingId(null);
    }
  }

  const lessons = [...product.course_lessons].sort((a, b) => a.order_index - b.order_index);
  const files = [...product.product_files].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="rounded-2xl border border-gold-light/60 bg-white/70 p-6">
      <h2 className="font-serif text-xl mb-4">{product.title}</h2>

      {lessons.length > 0 && (
        <ul className="flex flex-col gap-2 mb-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{lesson.title}</span>
                <button
                  onClick={() => playLesson(lesson.id)}
                  disabled={loadingId === lesson.id}
                  className="rounded-full border px-4 py-1 text-xs hover:bg-gold-light/30 disabled:opacity-50"
                >
                  {loadingId === lesson.id
                    ? "Cargando..."
                    : playingLessonId === lesson.id
                      ? "Cerrar"
                      : "Ver"}
                </button>
              </div>
              {playingLessonId === lesson.id && playingUrl && (
                <video
                  src={playingUrl}
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full rounded-xl bg-black"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{file.file_name}</span>
              <button
                onClick={() => downloadFile(file.id)}
                disabled={loadingId === file.id}
                className="rounded-full border px-4 py-1 text-xs hover:bg-gold-light/30 disabled:opacity-50"
              >
                {loadingId === file.id ? "Cargando..." : "Descargar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lessons.length === 0 && files.length === 0 && (
        <p className="text-sm text-foreground/60">Esta creadora todavía no subió el contenido.</p>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
