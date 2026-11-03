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

  return (
    <div className="flex flex-1 flex-col md:flex-row bg-beige-light">
      <aside className="w-full md:w-72 bg-white border-r border-gold-light/40 p-4 flex flex-col gap-4">
        <h2 className="font-serif text-xl">Metodología Poderosa</h2>
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gold">{category.title}</p>
            {modules
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
        ))}
      </aside>

      <main className="flex-1 px-6 py-10 md:px-12 flex justify-center">
        <div className="w-full max-w-2xl">
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
