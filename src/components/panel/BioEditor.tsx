"use client";

import { type TextStyle } from "@/lib/panel/types";

export function BioEditor({
  bio,
  style,
  onBioChange,
  onStyleChange,
}: {
  bio: string;
  style: TextStyle;
  onBioChange: (bio: string) => void;
  onStyleChange: (style: TextStyle) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Bio</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onStyleChange({ ...style, bold: !style.bold })}
          aria-pressed={style.bold}
          className={`h-7 w-7 rounded border text-sm font-bold ${style.bold ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
        >
          N
        </button>
        <button
          type="button"
          onClick={() => onStyleChange({ ...style, italic: !style.italic })}
          aria-pressed={style.italic}
          className={`h-7 w-7 rounded border text-sm italic ${style.italic ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
        >
          K
        </button>
        <label className="flex items-center gap-1 text-xs text-foreground/60 ml-2">
          Tamaño
          <input
            type="number"
            min={10}
            max={32}
            value={style.fontSize}
            onChange={(e) => onStyleChange({ ...style, fontSize: Number(e.target.value) || 16 })}
            className="w-14 rounded border px-1.5 py-0.5"
          />
        </label>
      </div>
      <textarea
        value={bio}
        onChange={(e) => onBioChange(e.target.value)}
        rows={4}
        style={{
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? "italic" : "normal",
          fontSize: style.fontSize,
        }}
        className="w-full rounded border px-3 py-2"
      />
    </div>
  );
}
