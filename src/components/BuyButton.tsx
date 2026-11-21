"use client";

import { useState } from "react";
import { trackEvent, trackFunnel } from "@/lib/analytics/client";

export type InstallmentOption = {
  /** Texto corto del botón, ej. "o paga en 3 cuotas de $165.667". */
  cta: string;
  /** Una línea por cuota, para explicar el calendario antes de pagar. */
  lines: string[];
  total: string;
  graceDays: number;
};

export function BuyButton({
  productId,
  slug,
  accentColor,
  size = "small",
  label = "Comprar",
  installments,
  signedIn = false,
}: {
  productId: string;
  slug: string;
  accentColor: string;
  size?: "small" | "large";
  label?: string;
  installments?: InstallmentOption;
  signedIn?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  // Consentimiento para novedades y lanzamientos: opcional y desmarcado.
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstallments, setShowInstallments] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function startCheckout(guest?: {
    buyerName?: string;
    buyerEmail?: string;
    marketingOptIn?: boolean;
    plan?: "cuotas";
    acceptInstallmentTerms?: boolean;
  }) {
    // Clic en el botón de compra (solo el primer clic, no el del formulario).
    if (!guest) {
      trackEvent("cta_comprar", { location: label });
      trackFunnel("cta_comprar", label);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...guest }),
      });
      const data = await res.json();

      if (res.status === 401) {
        // Sin sesión y sin datos de invitado todavía: pide nombre/correo
        // en vez de mandar a /login — comprar no debería exigir cuenta
        // primero, la cuenta se crea sola al aprobarse el pago.
        if (guest?.plan === "cuotas") {
          // La sesión se cerró mientras elegía cuotas: no cambiar a contado.
          setError("Tu sesión se cerró. Recarga la página e inténtalo de nuevo.");
          return;
        }
        setShowGuestForm(true);
        return;
      }
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago, intenta de nuevo.");
        return;
      }
      // Checkout iniciado: sin datos personales, solo producto y valor.
      // La compra NO se marca aquí: se envía desde el servidor cuando
      // Wompi confirma el pago (webhook), una sola vez por pedido.
      if (typeof data.amountCents === "number") {
        const value = data.amountCents / 100;
        trackEvent(
          "begin_checkout",
          { currency: data.currency ?? "COP", value, items: [{ item_id: productId, item_name: slug, price: value, quantity: 1 }] },
          { event: "InitiateCheckout", params: { currency: data.currency ?? "COP", value } },
        );
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("No se pudo conectar con Wompi, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleInstallmentsSubmit(e: React.FormEvent) {
    e.preventDefault();
    startCheckout({
      ...(signedIn ? {} : { buyerName: guestName.trim(), buyerEmail: guestEmail.trim(), marketingOptIn }),
      plan: "cuotas",
      acceptInstallmentTerms: acceptTerms,
    });
  }

  function openInstallments() {
    trackEvent("cta_cuotas", { location: label });
    trackFunnel("cta_cuotas", label);
    setError(null);
    setShowInstallments(true);
  }

  function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    startCheckout({ buyerName: guestName.trim(), buyerEmail: guestEmail.trim(), marketingOptIn });
  }

  return (
    <>
      <button
        onClick={() => startCheckout()}
        disabled={loading}
        className={
          size === "large"
            ? "w-full sm:w-auto rounded-full px-10 py-4 text-base font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            : "rounded-full px-4 py-1.5 text-xs text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        }
        style={{ backgroundColor: accentColor }}
      >
        {loading ? "Un momento..." : label}
      </button>

      {installments && (
        <button
          type="button"
          onClick={openInstallments}
          className="text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground"
        >
          {installments.cta}
        </button>
      )}

      {installments && showInstallments && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowInstallments(false)}
        >
          <form
            onSubmit={handleInstallmentsSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gold-light/60 text-left"
          >
            <h2 className="font-serif text-xl text-center text-foreground">Pago en 3 cuotas</h2>
            <p className="text-sm text-foreground/60 text-center -mt-2">Total {installments.total}. Cada cuota habilita un tramo de tu acceso:</p>
            <ol className="flex flex-col gap-2 text-sm">
              {installments.lines.map((line) => (
                <li key={line} className="rounded-xl bg-beige-light px-3 py-2">{line}</li>
              ))}
            </ol>
            <p className="text-xs text-foreground/60">
              Te enviamos por correo cada fecha de pago y un recordatorio antes. Si una cuota no se paga, el acceso se pausa{" "}
              {installments.graceDays} días después de su fecha límite y vuelve apenas la pagues.
            </p>

            {!signedIn && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Nombre completo
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Correo electrónico
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-foreground/60">
                  <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5" />
                  Quiero recibir novedades, lanzamientos y promociones de PODEROSAS por correo (opcional).
                </label>
              </>
            )}

            <label className="flex items-start gap-2 text-sm text-foreground/80">
              <input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1" />
              Entiendo el calendario de cuotas y que, si no pago una cuota a tiempo, mi acceso se pausa hasta que la pague.
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !acceptTerms}
              className="rounded-full bg-gold px-6 py-2.5 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-60"
            >
              {loading ? "Un momento..." : "Pagar la primera cuota"}
            </button>
          </form>
        </div>
      )}

      {showGuestForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowGuestForm(false)}
        >
          <form
            onSubmit={handleGuestSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm flex flex-col gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gold-light/60"
          >
            <h2 className="font-serif text-xl text-center text-foreground">
              Un paso antes de pagar
            </h2>
            <p className="text-sm text-foreground/60 text-center -mt-2">
              Con tu nombre y correo ya puedes comprar. Tu acceso llega a ese correo, sin tener
              que crear una cuenta ahora.
            </p>

            <label className="flex flex-col gap-1 text-sm">
              Nombre completo
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Correo electrónico
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
              />
            </label>

            <label className="flex items-start gap-2 text-xs text-foreground/60">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5"
              />
              Quiero recibir novedades, lanzamientos y promociones de PODEROSAS por correo (opcional).
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gold px-6 py-2.5 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-60"
            >
              {loading ? "Un momento..." : "Continuar al pago"}
            </button>

            <p className="text-sm text-center text-foreground/60">
              ¿Ya tienes cuenta?{" "}
              <a href={`/login?next=/${slug}`} className="text-gold hover:underline">
                Inicia sesión
              </a>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
