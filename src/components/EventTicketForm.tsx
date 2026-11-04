"use client";

import { useState } from "react";

export function EventTicketForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
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
      <label className="flex flex-col gap-1.5 text-sm text-left">
        Confirmar correo electrónico
        <input
          type="email"
          required
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          className="rounded-xl border border-gold-light/60 bg-white px-3.5 py-2.5 text-foreground focus:outline-none focus:border-gold"
        />
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
    </form>
  );
}
