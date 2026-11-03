"use client";

import { useState } from "react";

export function EventTicketForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageConsent, setImageConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, buyerName: name, buyerEmail: email, imageConsent }),
      });
      const data = await res.json();

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
      <label className="flex flex-col gap-1.5 text-sm text-left">
        Nombre completo
        <input
          type="text"
          required
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-gold-light/60 bg-white px-3.5 py-2.5 text-foreground focus:outline-none focus:border-gold"
        />
      </label>
      <label className="flex items-start gap-2.5 text-sm text-left text-foreground/70">
        <input
          type="checkbox"
          required
          checked={imageConsent}
          onChange={(e) => setImageConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-gold"
        />
        <span>
          Autorizo a Poderosas a tomar fotografías y videos durante el evento y a usar mi
          imagen con fines de difusión en redes sociales y comunicación de la marca.
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-full bg-gold px-6 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
      >
        {loading ? "Un momento..." : "Comprar mi entrada"}
      </button>
    </form>
  );
}
