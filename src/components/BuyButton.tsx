"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      className={
        size === "large"
          ? "w-full sm:w-auto rounded-full px-10 py-4 text-base font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          : "rounded-full px-4 py-1.5 text-xs text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      }
      style={{ backgroundColor: accentColor }}
    >
      {loading ? "Un momento..." : label}
    </button>
  );
}
