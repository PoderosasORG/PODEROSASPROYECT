import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: number) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Extensión propia (en vez del paquete oficial @tiptap/extension-font-size,
// que solo existe en versión "next"/pre-release todavía) — guarda el
// tamaño como estilo inline en un <span>, aplicado solo a la selección.
export const FontSizeMark = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}px` };
        },
      },
    };
  },

  parseHTML() {
    return [{ style: "font-size" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: number) =>
        ({ chain }: { chain: () => import("@tiptap/core").ChainedCommands }) =>
          chain().setMark(this.name, { size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => import("@tiptap/core").ChainedCommands }) =>
          chain().unsetMark(this.name).run(),
    } as Partial<import("@tiptap/core").RawCommands>;
  },
});
