"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Vuelve a cargar los datos del tablero cada minuto. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setUpdatedAt(new Date());
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <p className="text-xs text-foreground/50">
      Se actualiza solo cada {seconds} s · última: {updatedAt.toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })}
    </p>
  );
}
