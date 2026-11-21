// Links oficiales del lanzamiento con UTMs diferenciadas. Usar SIEMPRE
// estos links en cada canal para que el tablero sepa de dónde vienen las ventas.
const BASE = "https://poderosas.org/cursos/metodologia-poderosa";
const CAMPAIGN = "lanzamiento-metodologia-2026";

function link(source: string, medium: string, content?: string) {
  const p = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: CAMPAIGN });
  if (content) p.set("utm_content", content);
  return `${BASE}?${p.toString()}`;
}

export const UTM_LINKS = [
  // Este es el que ya está impreso en el QR de la diapositiva: no cambiarlo.
  { channel: "QR de la masterclass", url: `${BASE}?utm_source=masterclass&utm_campaign=presencial-2026` },
  { channel: "Instagram de Kat", url: link("instagram", "social", "kat") },
  { channel: "Instagram de Shei", url: link("instagram", "social", "shei") },
  { channel: "Instagram de Luz", url: link("instagram", "social", "luz") },
  { channel: "WhatsApp (mensajes del equipo)", url: link("whatsapp", "mensaje") },
  { channel: "Correo", url: link("email", "correo") },
  { channel: "Otros / referidas", url: link("referido", "referral") },
];

export const WHATSAPP_UTM_LINK = link("whatsapp", "mensaje");
