"use client";

import { useState } from "react";

/** "¿Tienes dudas? Pide orientación por WhatsApp" — con autorización explícita. */
export function OrientationForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const res = await fetch("/api/orientacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, question, consent }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? "No pudimos enviar tu solicitud. Intenta de nuevo.");
      setState("idle");
      return;
    }
    setState("done");
    if (data?.whatsappUrl) window.open(data.whatsappUrl, "_blank", "noopener");
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-gold-light/60 bg-white p-6 text-center">
      <p className="font-serif text-2xl">¿Tienes dudas?</p>
      <p className="mt-1 text-sm text-foreground/60">Escríbenos y te orientamos por WhatsApp, sin compromiso.</p>
      {state === "done" ? (
        <p className="mt-4 text-sm text-emerald-700">
          ¡Gracias! Recibimos tu solicitud. Si no se abrió WhatsApp, te escribiremos pronto al número que dejaste.
        </p>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-full bg-[#1f8f4e] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Quiero orientación por WhatsApp
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 text-left">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm" />
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Celular (WhatsApp)" className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm" />
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder="¿Cuál es tu duda? (opcional)" className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm" />
          <label className="flex items-start gap-2 text-xs text-foreground/70">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
            Autorizo a PODEROSAS a escribirme por WhatsApp para resolver mis dudas sobre la Metodología.
          </label>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <button disabled={state === "sending"} className="rounded-full bg-[#1f8f4e] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {state === "sending" ? "Enviando…" : "Enviar y abrir WhatsApp"}
          </button>
        </form>
      )}
    </div>
  );
}
