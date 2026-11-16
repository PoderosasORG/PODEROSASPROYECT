"use client";

import { useState } from "react";

// Lista de espera de la PRÓXIMA edición del evento presencial — distinta
// de WaitlistForm.tsx (lista de espera del curso virtual, tabla
// waitlist_signups). Guarda en su propia tabla (event_waitlist) porque
// acá sí se necesita nombre y celular, no solo el correo.
export function EventWaitlistForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Completa todos los campos.");
      return;
    }
    if (!consent) {
      setError("Debes autorizar el tratamiento de tus datos para continuar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/event-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar, intenta de nuevo.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("No se pudo enviar, intenta de nuevo.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full rounded-2xl bg-white border border-gold-light/60 p-6 text-center">
        <p className="font-serif text-lg text-foreground">
          ¡Ya haces parte de nuestra lista de futuras PODEROSAS! 💗
        </p>
        <p className="text-sm text-foreground/60 mt-2">
          Gracias por tu interés. Serás de las primeras en recibir noticias sobre nuestra
          próxima edición.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <input
        type="text"
        placeholder="Nombre completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        autoComplete="name"
        className="w-full rounded-xl border border-gold-light/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        required
      />
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
        className="w-full rounded-xl border border-gold-light/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        required
      />
      <input
        type="tel"
        placeholder="Celular con WhatsApp (ej. +57 300 123 4567)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        inputMode="tel"
        className="w-full rounded-xl border border-gold-light/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        required
      />

      <label className="flex items-start gap-2 text-xs text-foreground/60 text-left mt-1">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        Autorizo el tratamiento de mis datos personales y acepto recibir comunicaciones
        comerciales e información sobre próximos eventos de PODEROSAS.
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-60"
      >
        {loading ? "Enviando..." : "QUIERO SER DE LAS PRIMERAS"}
      </button>
    </form>
  );
}
