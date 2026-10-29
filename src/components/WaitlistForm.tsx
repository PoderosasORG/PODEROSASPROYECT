"use client";

import { useState } from "react";

export function WaitlistForm({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm font-medium text-gold">
        ¡Listo! Te avisamos a {email} apenas esté disponible.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
      <input
        type="email"
        required
        placeholder="Tu correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-full border border-gold-light/60 px-5 py-2.5 text-sm"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-gold px-6 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {status === "loading" ? "Un momento..." : "Avísame cuando esté listo"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-600 sm:absolute sm:mt-10">No se pudo guardar, intenta de nuevo.</p>
      )}
    </form>
  );
}
