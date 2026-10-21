export type ImageFocus = { url: string; focusX: number; focusY: number };
export const DEFAULT_IMAGE_FOCUS: ImageFocus = { url: "", focusX: 50, focusY: 50 };

export type Theme = {
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: "serif" | "sans" | "rounded" | "script" | "elegant" | "soft" | "editorial";
};

export const DEFAULT_THEME: Theme = {
  bgColor: "#FDF6EE",
  textColor: "#2A2420",
  accentColor: "#C9A24B",
  fontFamily: "serif",
};

export const FONT_STACKS: Record<Theme["fontFamily"], string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  rounded: "Verdana, 'Trebuchet MS', sans-serif",
  script: "var(--font-dancing-script), cursive",
  elegant: "var(--font-cormorant), serif",
  soft: "var(--font-quicksand), sans-serif",
  editorial: "var(--font-italiana), serif",
};

export const FONT_OPTIONS: { label: string; value: Theme["fontFamily"] }[] = [
  { label: "Serif elegante", value: "serif" },
  { label: "Sans moderna", value: "sans" },
  { label: "Redondeada", value: "rounded" },
  { label: "Manuscrita (femenina)", value: "script" },
  { label: "Elegante suave", value: "elegant" },
  { label: "Soft / redondeada 2", value: "soft" },
  { label: "Editorial fina", value: "editorial" },
];

// "html" es el contenido con formato (negrita/cursiva/tamaño aplicados
// solo a lo que se seleccionó, vía Tiptap) — se sanitiza antes de
// mostrarse (ver src/lib/panel/sanitize.ts).
export type ContentBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; image: ImageFocus; alt: string }
  | { id: string; type: "video"; url: string };
