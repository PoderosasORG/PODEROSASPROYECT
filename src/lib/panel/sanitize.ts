import DOMPurify from "isomorphic-dompurify";

// El HTML del bio/bloques de texto lo genera Tiptap, pero igual se
// sanitiza antes de insertarlo con dangerouslySetInnerHTML — por si la
// cuenta de la creadora se ve comprometida, o el HTML llega manipulado
// directo a la API. Solo se permiten las etiquetas de formato que el
// editor genera.
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "strong", "em", "span", "br"],
    ALLOWED_ATTR: ["style"],
  });
}
