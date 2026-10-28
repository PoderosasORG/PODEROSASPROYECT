"use client";

import { useState } from "react";

export function EventTicketForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ productId, buyerName: name, buyerEmail: email }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1 text-sm">
        Nombre completo
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Correo (ahí te llega la boleta)
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
      >
        {loading ? "Un momento..." : "Comprar mi entrada"}
      </button>
    </form>
  );
}
