"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/analytics/config";

const KEY = "pod_consent"; // "all" | "basic"

function readConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Aviso de cookies de publicidad. Solo aparece si hay Meta Pixel
 * configurado (NEXT_PUBLIC_META_PIXEL_ID en Vercel). El Pixel carga
 * únicamente si la visitante acepta; si no, nada se comparte con Meta.
 */
export function ConsentBanner() {
  const [consent, setConsent] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Leer localStorage solo en el navegador, después de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
  }, []);

  if (!META_PIXEL_ID) return null;

  function choose(value: "all" | "basic") {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    if (value === "all") {
      window.gtag?.("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    }
    setConsent(value);
  }

  return (
    <>
      {consent === "all" && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
      {consent === null && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-gold-light/60 bg-white p-4 text-sm text-foreground/80 shadow-lg sm:inset-x-auto sm:right-4">
          <p>
            Usamos cookies para medir cómo se usa el sitio. Si aceptas, también las usamos para mostrarte
            nuestros anuncios en Instagram y Facebook. Nunca compartimos tu nombre, correo ni teléfono.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => choose("basic")} className="rounded-full border border-gold-light px-4 py-1.5 text-xs">
              Solo las necesarias
            </button>
            <button onClick={() => choose("all")} className="rounded-full bg-gold px-4 py-1.5 text-xs text-white">
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
