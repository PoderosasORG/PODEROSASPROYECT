"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileUploadField } from "@/components/FileUploadField";

type Lesson = { id: string; title: string; order_index: number };

export function LessonManager({
  productId,
  initialLessons,
}: {
  productId: string;
  initialLessons: Lesson[];
}) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd() {
    if (newFiles.length === 0) {
      setError("Elige al menos un video.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      let nextOrder = lessons.length
        ? Math.max(...lessons.map((l) => l.order_index)) + 1
        : 0;
      const added: Lesson[] = [];

      for (const file of newFiles) {
        const filePath = `${productId}/lesson-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("product-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: row, error: insertError } = await supabase
          .from("course_lessons")
          .insert({
            product_id: productId,
            title: file.name.replace(/\.[^.]+$/, ""),
            video_url: filePath,
            order_index: nextOrder,
          })
          .select("id, title, order_index")
          .single();
        if (insertError) throw insertError;

        added.push(row);
        nextOrder += 1;
      }

      setLessons((prev) => [...prev, ...added]);
      setNewFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el video, intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRename(lesson: Lesson, title: string) {
    if (!title.trim() || title === lesson.title) return;
    setBusyId(lesson.id);
    const supabase = createClient();
    await supabase.from("course_lessons").update({ title: title.trim() }).eq("id", lesson.id);
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, title: title.trim() } : l)));
    setBusyId(null);
  }

  async function handleDelete(lesson: Lesson) {
    if (!confirm(`¿Borrar el módulo "${lesson.title}"? Esto no se puede deshacer.`)) return;
    setBusyId(lesson.id);
    const supabase = createClient();
    await supabase.from("course_lessons").delete().eq("id", lesson.id);
    setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    setBusyId(null);
  }

  return (
    <div className="w-full max-w-lg flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-3">
        <h2 className="font-serif text-lg">Módulos ya subidos</h2>
        {lessons.length === 0 && (
          <p className="text-sm text-foreground/60">Todavía no hay módulos — agrega el primero abajo.</p>
        )}
        {lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center gap-2">
            <input
              defaultValue={lesson.title}
              onBlur={(e) => handleRename(lesson, e.target.value)}
              disabled={busyId === lesson.id}
              className="flex-1 rounded border px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => handleDelete(lesson)}
              disabled={busyId === lesson.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col items-center gap-3">
        <h2 className="font-serif text-lg self-start">Agregar módulo nuevo</h2>
        <FileUploadField
          label="Elegir video(s)"
          multiple
          accept="video/*"
          files={newFiles}
          onChange={setNewFiles}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={uploading || newFiles.length === 0}
          className="rounded-full bg-gold px-6 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Agregar a este curso"}
        </button>
      </div>
    </div>
  );
}
