"use client";

import { useEffect, useState } from "react";

// Navegadores embebidos (Instagram, Facebook, TikTok) suelen bloquear o
// romper el checkout de Wompi — el pago nunca carga bien ahí. Se detecta
// por el user agent para avisarle a la compradora antes de que intente
// pagar y se quede atascada sin saber por qué.
function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|Twitter|Line\//i.test(ua);
}

export function EventTicketForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  const emailsTyped = email.length > 0 && emailConfirm.length > 0;
  const emailsMatch = email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFallbackUrl(null);

    if (!emailsMatch) {
      setError("Los correos no coinciden. Revísalos antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout-evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Comprar la entrada implica autorizar el uso de imagen — no hay
        // opción de marcar que no, por eso no es un checkbox separado.
        body: JSON.stringify({ productId, buyerName: name, buyerEmail: email, imageConsent: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago, intenta de nuevo.");
        setLoading(false);
        return;
      }

      // Algunos navegadores (sobre todo embebidos dentro de apps) a veces
      // no redirigen de inmediato o bloquean la navegación. Dejamos un
      // enlace visible de respaldo para que nunca quede sin salida.
      setFallbackUrl(data.checkoutUrl);
      window.location.href = data.checkoutUrl;
    } catch {
      setError("No se pudo conectar con Wompi, intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      {inApp && (
        <div className="rounded-xl border border-gold bg-gold/10 px-4 py-3 text-xs text-foreground/80 text-left leading-relaxed">
          <strong>Estás viendo esto dentro de Instagram/TikTok/Facebook.</strong> El pago puede
          fallar o no cargar bien aquí. Toca los tres puntos (⋮) arriba a la derecha y elige
          &quot;Abrir en el navegador&quot; (Chrome o Safari) antes de comprar.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-left">
          Nombre completo
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-gold-light/60 bg-white px-3.5 py-2.5 text-foreground focus:outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-left">
          Correo electrónico (ahí recibirás tu confirmación)
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-gold-light/60 bg-white px-3.5 py-2.5 text-foreground focus:outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-left">
          Confirmar correo electrónico
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={emailConfirm}
            onChange={(e) => setEmailConfirm(e.target.value)}
            className="rounded-xl border border-gold-light/60 bg-white px-3.5 py-2.5 text-foreground focus:outline-none focus:border-gold"
          />
          {emailsTyped && (
            <span className={emailsMatch ? "text-xs text-green-600" : "text-xs text-red-500"}>
              {emailsMatch ? "✓ Los correos coinciden" : "Los correos todavía no coinciden"}
            </span>
          )}
        </label>
        <p className="text-[11px] text-foreground/40 text-left leading-relaxed">
          Al comprar tu entrada autorizas la grabación de contenido audiovisual con tu imagen
          con fines de difusión de la marca. Si no estás de acuerdo, notifícanos a{" "}
          katysheicomunicacion@gmail.com.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-full bg-gold px-6 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loading ? "Un momento..." : "Comprar mi entrada"}
        </button>
        {fallbackUrl && (
          <a
            href={fallbackUrl}
            className="text-xs text-center text-gold underline"
          >
            ¿No te llevó a la página de pago? Haz clic aquí.
          </a>
        )}
      </form>
    </div>
  );
}
