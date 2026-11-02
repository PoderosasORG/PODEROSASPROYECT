// src/components/panel/metodologia/ModuleList.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CategoryModule } from "@/lib/metodologiaPoderosa";
import { ModuleForm } from "./ModuleForm";

export function ModuleList({
  categoryId,
  initialModules,
}: {
  categoryId: string;
  initialModules: CategoryModule[];
}) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [editing, setEditing] = useState<CategoryModule | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  async function handleDelete(module: CategoryModule) {
    if (!confirm(`¿Borrar el módulo "${module.title}"? Esto no se puede deshacer.`)) return;
    setBusyId(module.id);
    const supabase = createClient();
    const { error } = await supabase.from("category_modules").delete().eq("id", module.id);
    if (error) {
      alert("No se pudo borrar el módulo, intenta de nuevo.");
      setBusyId(null);
      return;
    }
    setModules((prev) => prev.filter((m) => m.id !== module.id));
    setBusyId(null);
  }

  async function handleMove(module: CategoryModule, direction: -1 | 1) {
    const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
    const index = sorted.findIndex((m) => m.id === module.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;

    setBusyId(module.id);
    const supabase = createClient();
    await Promise.all([
      supabase.from("category_modules").update({ order_index: swapWith.order_index }).eq("id", module.id),
      supabase.from("category_modules").update({ order_index: module.order_index }).eq("id", swapWith.id),
    ]);
    router.refresh();
    setBusyId(null);
  }

  if (editing) {
    return (
      <ModuleForm
        categoryId={categoryId}
        existing={editing === "new" ? null : editing}
        nextOrderIndex={modules.length ? Math.max(...modules.map((m) => m.order_index)) + 1 : 0}
        onDone={(saved) => {
          setModules((prev) => {
            const withoutSaved = prev.filter((m) => m.id !== saved.id);
            return [...withoutSaved, saved];
          });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gold-light/60 p-5 flex flex-col gap-3">
        <h2 className="font-serif text-lg">Módulos de tu categoría</h2>
        {sorted.length === 0 && (
          <p className="text-sm text-foreground/60">Todavía no hay módulos — agrega el primero abajo.</p>
        )}
        {sorted.map((module, index) => (
          <div key={module.id} className="flex items-center gap-2 border-b border-gold-light/30 pb-2 last:border-0">
            <div className="flex flex-col">
              <button
                onClick={() => handleMove(module, -1)}
                disabled={busyId !== null || index === 0}
                className="text-xs disabled:opacity-30"
                aria-label="Subir"
              >
                ▲
              </button>
              <button
                onClick={() => handleMove(module, 1)}
                disabled={busyId !== null || index === sorted.length - 1}
                className="text-xs disabled:opacity-30"
                aria-label="Bajar"
              >
                ▼
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{module.title}</p>
              <p className="text-xs text-foreground/50">
                {module.is_published ? "Publicado" : "Borrador"}
                {!module.bunny_video_id && " · video sin terminar de subir"}
              </p>
            </div>
            <button
              onClick={() => setEditing(module)}
              disabled={busyId === module.id}
              className="text-xs text-gold hover:underline disabled:opacity-50"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(module)}
              disabled={busyId === module.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEditing("new")}
        className="self-start rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
      >
        Cargar material
      </button>
    </div>
  );
}
