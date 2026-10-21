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

// Para mostrar la bio como texto plano y corto (tarjetas del home,
// resúmenes) — quita todas las etiquetas en vez de sanitizarlas, y
// recorta a un largo razonable para una tarjeta chica.
export function stripHtml(html: string, maxLength = 140): string {
  const plain = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/\s+/g, " ").trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + "…";
}
