"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function PayInstallmentButton({ token, label }: { token: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cuotas/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago, intenta de nuevo.");
        return;
      }
      if (typeof data.amountCents === "number") {
        trackEvent("begin_checkout", { currency: data.currency ?? "COP", value: data.amountCents / 100, payment_type: "cuota" });
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("No se pudo conectar con Wompi, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={pay}
        disabled={loading}
        className="rounded-full bg-[#bd7d47] px-10 py-4 text-base font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Un momento..." : label}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-foreground/50">🔒 Pago seguro con Wompi: tarjeta, PSE o Nequi.</p>
    </div>
  );
}
