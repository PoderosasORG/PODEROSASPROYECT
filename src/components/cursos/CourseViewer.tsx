// src/components/cursos/CourseViewer.tsx
"use client";

import { useState } from "react";
import type { CategoryModule, CourseCategory } from "@/lib/metodologiaPoderosa";
import { ModulePlayer } from "./ModulePlayer";

type SidebarCategory = Pick<CourseCategory, "id" | "title" | "order_index">;
type SidebarModule = Pick<
  CategoryModule,
  "id" | "category_id" | "title" | "description" | "custom_thumbnail_url" | "order_index" | "is_published"
>;

export function CourseViewer({
  categories,
  modules,
}: {
  categories: SidebarCategory[];
  modules: SidebarModule[];
}) {
  const [selected, setSelected] = useState<SidebarModule | null>(modules[0] ?? null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(
    selected?.category_id ?? categories[0]?.id ?? null,
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row bg-beige-light">
      <aside className="w-full md:w-72 bg-white border-r border-gold-light/40 p-4 flex flex-col gap-2">
        <h2 className="font-serif text-xl mb-2">Metodología Poderosa</h2>
        {categories.map((category) => {
          const isOpen = openCategoryId === category.id;
          return (
            <div key={category.id} className="flex flex-col gap-1">
              <button
                onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                className="flex items-center justify-between text-left text-sm font-medium text-gold py-1"
              >
                {category.title}
                <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen &&
                modules
                  .filter((m) => m.category_id === category.id)
                  .map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setSelected(module)}
                      className={`text-left text-sm px-2 py-1.5 rounded ${
                        selected?.id === module.id ? "bg-gold-light/40 font-medium" : "hover:bg-beige-light"
                      }`}
                    >
                      {module.title}
                    </button>
                  ))}
            </div>
          );
        })}
      </aside>

      <main className="flex-1 px-6 py-10 md:px-12 flex justify-center">
        <div className="w-full max-w-3xl">
          {selected ? (
            <ModulePlayer key={selected.id} module={selected} />
          ) : (
            <p>Todavía no hay módulos publicados.</p>
          )}
        </div>
      </main>
    </div>
  );
}
