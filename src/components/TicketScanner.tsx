"use client";

import { useRef, useState } from "react";

type Result = { kind: "ok" | "used" | "error"; message: string };

export function TicketScanner() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function validate(ticketId: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/escaner/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ kind: "ok", message: `Entrada válida: ${data.buyerName ?? ""}` });
      } else if (res.status === 409) {
        setResult({ kind: "used", message: `Ya usada${data.buyerName ? " — " + data.buyerName : ""}` });
      } else {
        setResult({ kind: "error", message: data.error ?? "Error validando la boleta." });
      }
    } catch {
      setResult({ kind: "error", message: "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
      setCode("");
    }
  }

  async function startCamera() {
    // BarcodeDetector no existe en todos los navegadores (ej. Safari,
    // Firefox). Si no está disponible, se usa el campo manual de abajo.
    if (!("BarcodeDetector" in window)) {
      setResult({ kind: "error", message: "Este navegador no soporta escaneo por cámara. Usa el campo manual." });
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setScanning(true);

    // @ts-expect-error BarcodeDetector no tiene tipos oficiales en TS todavía.
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    const tick = async () => {
      if (!videoRef.current || !streamRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopCamera();
          await validate(codes[0].rawValue);
          return;
        }
      } catch {
        // frame no legible todavía, seguimos intentando
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      {!scanning ? (
        <button
          onClick={startCamera}
          className="rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
        >
          Escanear con cámara
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} className="w-full rounded" muted playsInline />
          <button onClick={stopCamera} className="text-sm underline">
            Cancelar
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) validate(code.trim());
        }}
        className="flex flex-col gap-2"
      >
        <label className="flex flex-col gap-1 text-sm">
          O escribe el código de la boleta a mano
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-full border px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? "Validando..." : "Validar"}
        </button>
      </form>

      {result && (
        <p
          className={
            result.kind === "ok"
              ? "text-green-600 font-medium"
              : result.kind === "used"
                ? "text-amber-600 font-medium"
                : "text-red-600 font-medium"
          }
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
