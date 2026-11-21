import Image from "next/image";

// Maqueta (solo visual, no clicable) de cómo se ve el curso por dentro,
// para dar confianza: título del módulo, video y la barra de módulos.
// Los nombres de los módulos son los reales del curso.
const SIDEBAR = [
  { group: "¿Quién soy?", items: ["Introducción general", "Quiénes somos", "Somos una totalidad"] },
  { group: "¿Qué quiero?", items: ["Dimensión física", "Dimensión energética"] },
  { group: "¿Cómo lo logro?", items: ["Cómo empezar cuando no tienes ganas"] },
];

export function CoursePreview() {
  return (
    <div className="pointer-events-none select-none w-full max-w-[620px]" aria-hidden>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(43,15,29,0.45)] ring-1 ring-black/5">
        {/* barra del navegador */}
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-[#fdf2f6] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f2a0bf]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0b384]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#c9b3e6]" />
          <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-0.5 text-[10px] text-foreground/40">
            poderosas.org/cursos/metodologia-poderosa
          </span>
        </div>

        <div className="grid grid-cols-[1fr_38%] gap-3 bg-[#fbe4ec] p-3 sm:p-4">
          {/* módulo actual */}
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[9px] uppercase tracking-[0.2em] text-gold">Módulo 3 · ¿Cómo lo logro?</p>
            <p className="font-serif text-base sm:text-xl leading-tight text-[#2b0f1d]">Cómo empezar cuando no tienes ganas</p>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[#2b0f1d]">
              <Image src="/images/creators/kat.webp" alt="Kat en una clase de la Metodología PODEROSAS" fill sizes="320px" className="object-cover object-[50%_30%] opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 text-gold" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <div className="absolute inset-x-3 bottom-2 h-1 rounded-full bg-white/30">
                <div className="h-1 w-1/3 rounded-full bg-[#f2a0bf]" />
              </div>
            </div>
            <div className="rounded-lg bg-white/70 px-2.5 py-1.5 text-[9px] text-foreground/60">
              Material de apoyo · Cartilla descargable
            </div>
          </div>

          {/* barra de módulos */}
          <div className="flex flex-col gap-2 rounded-xl bg-white p-2.5">
            <p className="font-serif text-xs text-[#2b0f1d]">Tu recorrido</p>
            {SIDEBAR.map((g) => (
              <div key={g.group} className="flex flex-col gap-1">
                <p className="text-[8px] font-semibold uppercase tracking-wider text-gold">{g.group}</p>
                {g.items.map((it, i) => {
                  const active = it === "Cómo empezar cuando no tienes ganas";
                  const done = g.group === "¿Quién soy?" && i < 2;
                  return (
                    <div
                      key={it}
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8.5px] leading-tight ${active ? "bg-[#fbe4ec] font-semibold text-[#2b0f1d]" : "text-foreground/60"}`}
                    >
                      <span
                        className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500" : "border-foreground/25"}`}
                      />
                      <span className="truncate">{it}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.25em] text-foreground/45">Así se ve tu curso por dentro</p>
    </div>
  );
}
