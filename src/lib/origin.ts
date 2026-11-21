import type { NextRequest } from "next/server";

export const ORIGIN_COOKIE = "pod_origin";
export const VISITOR_COOKIE = "pod_vid";

const KNOWN: Record<string, string> = {
  "instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "lm.facebook.com": "Facebook",
  "tiktok.com": "TikTok",
  "youtube.com": "YouTube",
  "google.com": "Google",
  "wa.me": "WhatsApp",
  "web.whatsapp.com": "WhatsApp",
  "linktr.ee": "Linktree",
  "t.co": "X / Twitter",
};

function clean(value: string) {
  return value.replace(/[^\p{L}\p{N} ._\-/]/gu, "").trim().slice(0, 80);
}

/**
 * Nombre del canal según las UTMs del lanzamiento (ver UTM_LINKS en
 * src/lib/analytics/utm.ts). Lo que no coincida se guarda tal cual.
 */
function channelLabel(source: string, content: string | null, campaign: string | null) {
  const s = source.toLowerCase();
  const c = (content ?? "").toLowerCase();
  if (s === "masterclass") return "QR masterclass";
  if (s === "instagram" && c === "kat") return "Instagram Kat";
  if (s === "instagram" && c === "shei") return "Instagram Shei";
  if (s === "instagram" && c === "luz") return "Instagram Luz";
  if (s === "whatsapp") return c ? `WhatsApp · ${content}` : "WhatsApp";
  const extra = content || campaign;
  return extra ? `${source} · ${extra}` : source;
}

/** ¿La URL trae una fuente explícita (utm_source o ?ref=)? */
export function hasExplicitSource(request: NextRequest) {
  return request.nextUrl.searchParams.has("utm_source") || request.nextUrl.searchParams.has("ref");
}

/** utm_source/ref de la URL, o el dominio externo que mandó la visita. */
export function detectOrigin(request: NextRequest): string | null {
  const params = request.nextUrl.searchParams;
  const utm = params.get("utm_source");
  const ref = params.get("ref");
  if (utm) {
    return clean(channelLabel(utm, params.get("utm_content"), params.get("utm_campaign"))) || null;
  }
  if (ref) return clean(`ref: ${ref}`) || null;

  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.replace(/^www\./, "");
    if (host === request.nextUrl.hostname.replace(/^www\./, "")) return null;
    if (host.includes("wompi")) return null;
    return KNOWN[host] ?? clean(host);
  } catch {
    return null;
  }
}

/** Origen guardado en la cookie, o "Directo" si no hay. */
export function originFromCookie(request: NextRequest): string {
  return request.cookies.get(ORIGIN_COOKIE)?.value || "Directo";
}
