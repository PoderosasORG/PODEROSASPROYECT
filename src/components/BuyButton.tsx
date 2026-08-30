"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({
  productId,
  slug,
  accentColor,
}: {
  productId: string;
  slug: string;
  accentColor: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push(`/login?next=/${slug}`);
        return;
      }
      if (!res.ok || !data.checkoutUrl) {
        alert(data.error ?? "No se pudo iniciar el pago, intenta de nuevo.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      alert("No se pudo conectar con Wompi, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full px-4 py-1.5 text-xs text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      style={{ backgroundColor: accentColor }}
    >
      {loading ? "Un momento..." : "Comprar"}
    </button>
  );
}
