"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BonusFile = { id: string; file_name: string; display_name: string | null };

export function BonusFileManager({
  productId,
  initialFiles,
}: {
  productId: string;
  initialFiles: BonusFile[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newFile) {
      setError("Elige un archivo.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión inválida, recarga la página.");

      const path = `${user.id}/bonos/${Date.now()}-${newFile.name}`;
      const { error: uploadError } = await supabase.storage.from("product-files").upload(path, newFile);
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("product_files")
        .insert({
          product_id: productId,
          file_path: path,
          file_name: newFile.name,
          display_name: displayName.trim() || null,
        })
        .select("id, file_name, display_name")
        .single();
      if (insertError) throw insertError;

      setFiles((prev) => [...prev, row]);
      setNewFile(null);
      setDisplayName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file: BonusFile) {
    if (!confirm(`¿Borrar "${file.display_name || file.file_name}"? Esto no se puede deshacer.`)) return;
    setBusyId(file.id);
    const supabase = createClient();
    const { error } = await supabase.from("product_files").delete().eq("id", file.id);
    if (!error) setFiles((prev) => prev.filter((f) => f.id !== file.id));
    setBusyId(null);
  }

  return (
    <section className="bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-4">
      <div>
        <h3 className="font-serif text-xl">Bonos descargables del curso</h3>
        <p className="text-sm text-foreground/60 mt-1">
          El ebook, las plantillas y demás archivos de regalo — solo quien compró el curso puede
          descargarlos.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 text-sm bg-beige-light/60 rounded-lg px-3 py-2"
            >
              <span>{file.display_name || file.file_name}</span>
              <button
                onClick={() => handleDelete(file)}
                disabled={busyId === file.id}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 bg-beige-light/60 rounded-xl p-3">
        <input
          type="file"
          onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border file:border-gold file:bg-white file:px-3 file:py-1.5 file:text-gold file:text-xs file:font-medium file:cursor-pointer hover:file:bg-gold hover:file:text-white file:transition-colors"
        />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nombre que verá quien compró (ej: Ebook 50 acuerdos en pareja)"
          className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm bg-white"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={uploading || !newFile}
          className="self-start rounded-full bg-gold px-5 py-2 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Agregar bono"}
        </button>
      </div>
    </section>
  );
}
