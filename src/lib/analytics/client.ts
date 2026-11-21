"use client";

// Eventos del embudo en el navegador. Nunca incluyen nombre, correo,
// teléfono ni nada que identifique a la persona.
type Params = Record<string, string | number | undefined | Array<Record<string, string | number>>>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** GA4 (si está cargado) + Meta Pixel (solo si la persona aceptó publicidad). */
export function trackEvent(name: string, params: Params = {}, meta?: { event: string; params?: Params }) {
  try {
    window.gtag?.("event", name, params);
    if (meta) window.fbq?.("track", meta.event, meta.params ?? {});
  } catch {
    // La medición nunca debe romper la página.
  }
}

/** Evento propio para el tablero del equipo (anónimo). */
export function trackFunnel(event: string, location: string) {
  fetch("/api/evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, location }),
    keepalive: true,
  }).catch(() => {});
}
