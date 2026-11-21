"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Cuenta regresiva hasta el cierre del lanzamiento (fecha absoluta, así
// que funciona igual en cualquier zona horaria; la fecha está definida en
// hora de Colombia en lib/metodologiaPoderosasLanzamiento.ts). Al llegar a
// cero refresca la página: el servidor deja de mostrar el precio especial
// y los bonos.
function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    días: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    seg: s % 60,
  };
}

export function Countdown({ deadlineIso, tone = "light" }: { deadlineIso: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const deadline = new Date(deadlineIso).getTime();
  // null en el primer render para que el HTML del servidor y del cliente
  // coincidan (la hora exacta solo se conoce en el navegador).
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = deadline - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(id);
        router.refresh();
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [deadline, router]);

  const p = parts(left ?? deadline - deadline);
  const box =
    tone === "dark"
      ? "bg-white/10 border-white/20 text-white"
      : "bg-white border-gold-light/70 text-foreground";

  return (
    <div className="flex items-center justify-center gap-2" aria-live="off" aria-label="Tiempo restante de la oferta">
      {Object.entries(p).map(([label, value]) => (
        <div key={label} className={`min-w-[3.6rem] rounded-xl border px-2 py-2 text-center ${box}`}>
          <div className="font-serif text-2xl leading-none tabular-nums">
            {left == null ? "--" : String(value).padStart(2, "0")}
          </div>
          <div className={`mt-1 text-[10px] uppercase tracking-wider ${tone === "dark" ? "text-white/60" : "text-foreground/50"}`}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
