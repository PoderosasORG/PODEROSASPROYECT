"use client";

import { useState } from "react";

export function ResendTicketButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch("/api/panel/clientes/reenviar-boleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <span className="text-xs text-green-700">✓ Reenviado</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="text-xs text-gold hover:underline disabled:opacity-50 disabled:no-underline"
    >
      {state === "loading" ? "Enviando…" : state === "error" ? "Error, reintentar" : "Reenviar boleta"}
    </button>
  );
}
