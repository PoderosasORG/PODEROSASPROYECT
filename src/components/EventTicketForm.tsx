"use client";

import { useState } from "react";

export function EventTicketForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

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

    // Se abre la ventana de pago YA, dentro del mismo clic — antes de
    // esperar la respuesta del servidor. Navegadores embebidos (Instagram,
    // TikTok, Facebook) solo permiten abrir/redirigir ventanas en el
    // instante exacto del gesto del usuario; si se espera a que el fetch
    // termine para recién ahí navegar, el gesto ya "expiró" y bloquean la
    // redirección en silencio (así quedaban las compras atascadas). Se
    // guarda la referencia y se le asigna el link real en cuanto llega.
    const payWindow = window.open("about:blank", "_blank");

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
        payWindow?.close();
        return;
      }

      setFallbackUrl(data.checkoutUrl);

      if (payWindow && !payWindow.closed) {
        payWindow.location.href = data.checkoutUrl;
      } else {
        // El navegador bloqueó la ventana nueva (pasa en algunos navegadores
        // de escritorio con bloqueador de pop-ups) — se redirige la misma
        // pestaña, como antes.
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("No se pudo conectar con Wompi, intenta de nuevo.");
      setLoading(false);
      payWindow?.close();
    }
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
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
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-center text-gold underline">
            ¿No se abrió la página de pago? Haz clic aquí.
          </a>
        )}
      </form>
    </div>
  );
}
