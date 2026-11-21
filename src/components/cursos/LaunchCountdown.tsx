"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatRemaining(ms: number) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Solo visual — el precio real que se cobra siempre lo decide el
 * servidor (ver metodologiaPoderosasLanzamiento.ts), nunca este reloj
 * del navegador. Si alguien atrasa su hora local, de todas formas paga
 * el precio que corresponda según la hora real del servidor.
 */
export function LaunchCountdown({ deadlineIso }: { deadlineIso: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => {
      const ms = deadline - Date.now();
      setRemaining(formatRemaining(ms));
      // Al llegar a cero, el servidor decide qué precio/oferta sigue.
      if (ms <= 0) {
        clearInterval(id);
        router.refresh();
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [deadlineIso, router]);

  if (remaining === null) return null;

  return (
    <p className="text-xs text-foreground/60">
      ⏱ Quedan <span className="font-medium text-foreground">{remaining}</span> con este precio
    </p>
  );
}
