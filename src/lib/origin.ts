import type { NextRequest } from "next/server";

export const ORIGIN_COOKIE = "pod_origin";

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

/** utm_source/ref de la URL, o el dominio externo que mandó la visita. */
export function detectOrigin(request: NextRequest): string | null {
  const params = request.nextUrl.searchParams;
  const utm = params.get("utm_source");
  const ref = params.get("ref");
  if (utm) {
    const campaign = params.get("utm_campaign");
    return clean(campaign ? `${utm} / ${campaign}` : utm) || null;
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
