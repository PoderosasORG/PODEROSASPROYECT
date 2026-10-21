"use client";

import { type Theme, FONT_OPTIONS } from "@/lib/panel/types";

export function ThemeEditor({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Estilo visual</p>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Color de fondo
          <input
            type="color"
            value={theme.bgColor}
            onChange={(e) => onChange({ ...theme, bgColor: e.target.value })}
            className="h-9 w-full rounded border cursor-pointer"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Color de texto
          <input
            type="color"
            value={theme.textColor}
            onChange={(e) => onChange({ ...theme, textColor: e.target.value })}
            className="h-9 w-full rounded border cursor-pointer"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Color de acento
          <input
            type="color"
            value={theme.accentColor}
            onChange={(e) => onChange({ ...theme, accentColor: e.target.value })}
            className="h-9 w-full rounded border cursor-pointer"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        Tipografía
        <select
          value={theme.fontFamily}
          onChange={(e) => onChange({ ...theme, fontFamily: e.target.value as Theme["fontFamily"] })}
          className="rounded border px-2 py-1.5 text-sm text-foreground"
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
