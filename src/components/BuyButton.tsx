"use client";

import { useState } from "react";

export function BuyButton({
  productId,
  slug,
  accentColor,
  size = "small",
  label = "Comprar",
}: {
  productId: string;
  slug: string;
  accentColor: string;
  size?: "small" | "large";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(guest?: { buyerName: string; buyerEmail: string }) {
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
        setShowGuestForm(true);
        return;
      }
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago, intenta de nuevo.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("No se pudo conectar con Wompi, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    startCheckout({ buyerName: guestName.trim(), buyerEmail: guestEmail.trim() });
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
