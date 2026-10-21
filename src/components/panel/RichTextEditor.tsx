"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontSizeMark } from "@/lib/tiptap/FontSizeMark";

const SIZES = [14, 16, 18, 20, 24, 28];

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, bulletList: false, orderedList: false }), FontSizeMark],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "min-h-[96px] rounded border px-3 py-2 text-sm focus:outline-none" },
    },
  });

  if (!editor) return null;

  // mousedown (no solo click) con preventDefault: un botón normal le
  // quita el foco al editor ANTES del clic, y eso pierde la selección
  // de texto que se iba a formatear. Es el workaround documentado de
  // Tiptap para barras de herramientas.
  const stopMouseDown = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onMouseDown={stopMouseDown}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
          className={`h-7 w-7 rounded border text-sm font-bold ${editor.isActive("bold") ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
          title="Negrita (aplica solo a lo seleccionado)"
        >
          N
        </button>
        <button
          type="button"
          onMouseDown={stopMouseDown}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
          className={`h-7 w-7 rounded border text-sm italic ${editor.isActive("italic") ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
          title="Cursiva (aplica solo a lo seleccionado)"
        >
          K
        </button>
        <span className="w-px h-5 bg-gold-light/60 mx-1" />
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onMouseDown={stopMouseDown}
            onClick={() => editor.chain().focus().setFontSize(s).run()}
            aria-pressed={editor.isActive("fontSize", { size: s })}
            className={`h-7 px-2 rounded border text-xs ${editor.isActive("fontSize", { size: s }) ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
            title={`${s}px (aplica solo a lo seleccionado)`}
          >
            {s}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <p className="text-[11px] text-foreground/50">Selecciona el texto y luego aplica negrita, cursiva o tamaño.</p>
    </div>
  );
}
