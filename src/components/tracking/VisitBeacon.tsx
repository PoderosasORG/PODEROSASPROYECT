"use client";

import { useEffect } from "react";

/** Avisa (una vez por carga) que se visitó la landing. Anónimo. */
export function VisitBeacon({ page }: { page: "home" | "metodologia" }) {
  useEffect(() => {
    fetch("/api/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
      keepalive: true,
    }).catch(() => {});
  }, [page]);
  return null;
}
