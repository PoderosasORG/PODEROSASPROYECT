// src/components/cursos/CourseViewer.tsx
"use client";

import { useMemo, useState } from "react";
import type { CategoryModule, CourseCategory } from "@/lib/metodologiaPoderosa";
import { ModulePlayer } from "./ModulePlayer";
import { CourseBonuses } from "./CourseBonuses";

type SidebarCategory = Pick<CourseCategory, "id" | "title" | "order_index">;
type SidebarModule = Pick<
  CategoryModule,
  "id" | "category_id" | "title" | "description" | "custom_thumbnail_url" | "order_index" | "is_published"
>;

export function CourseViewer({
  categories,
  modules,
  productId,
  completedModuleIds,
}: {
  categories: SidebarCategory[];
  modules: SidebarModule[];
  productId: string;
  completedModuleIds: string[];
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedModuleIds));
  const [selected, setSelected] = useState<SidebarModule | null>(modules[0] ?? null);

  // Orden único de todos los módulos (en el orden en que aparecen las
  // categorías) — sirve para saber cuál es "el siguiente" sin ver.
  const orderedModules = useMemo(
    () =>
      categories.flatMap((category) =>
        modules
          .filter((m) => m.category_id === category.id)
          .sort((a, b) => a.order_index - b.order_index),
      ),
    [categories, modules],
  );

  const nextModule = orderedModules.find((m) => !completed.has(m.id)) ?? null;

  function markComplete(moduleId: string, isComplete: boolean) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (isComplete) next.add(moduleId);
      else next.delete(moduleId);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-beige-light">
      <div className="px-6 pt-6">
        <h1 className="font-serif text-xl">Metodología Poderosa</h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 px-6 py-6">
        {/* Columna principal: video + contenido del módulo seleccionado */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <ModulePlayer
              key={selected.id}
              module={selected}
              isComplete={completed.has(selected.id)}
              onToggleComplete={(isComplete) => markComplete(selected.id, isComplete)}
            />
          ) : (
            <p>Todavía no hay módulos publicados.</p>
          )}
        </div>

        {/* Columna derecha: esquema completo del curso, con check de lo ya
            visto y Ver/Iniciar para entrar a cada clase. */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          {nextModule && (
            <div className="rounded-xl border border-gold-light/60 bg-gold-light/15 p-3 flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-wide text-foreground/50 font-medium">
                Continuar con el siguiente
              </p>
              <p className="text-sm font-medium text-foreground">{nextModule.title}</p>
              <button
                onClick={() => setSelected(nextModule)}
                className="self-start rounded-full bg-foreground px-4 py-1.5 text-white text-xs font-medium hover:bg-gold transition-colors"
              >
                Empezar →
              </button>
            </div>
          )}

          <div className="bg-white border border-gold-light/40 rounded-xl p-4 flex flex-col gap-4">
            <h2 className="font-serif text-lg">Descripción general</h2>
            {categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-wide text-gold font-medium">
                  {category.title}
                </p>
                {modules
                  .filter((m) => m.category_id === category.id)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((module) => {
                    const isDone = completed.has(module.id);
                    const isSelected = selected?.id === module.id;
                    return (
                      <button
                        key={module.id}
                        onClick={() => setSelected(module)}
                        className={`flex items-center gap-2.5 text-left text-sm px-2 py-2 rounded transition-colors ${
                          isSelected
                            ? "bg-gold-light/40 font-medium"
                            : isDone
                              ? "hover:bg-beige-light"
                              : "hover:bg-beige-light opacity-50"
                        }`}
                      >
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                            isDone
                              ? "bg-gold border-gold text-white"
                              : "border-foreground/30 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="flex-1">{module.title}</span>
                        <span className="shrink-0 text-[11px] text-gold font-medium">
                          {isDone ? "Ver" : "Iniciar"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>

          <CourseBonuses productId={productId} />
        </aside>
      </div>
    </div>
  );
}
