"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

// Galería editorial con ampliación (lightbox). Recibe las fotos reales
// del evento que existan en public/images/masterclass-2026/.
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (d: number) => setOpen((i) => (i == null ? i : (i + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, move]);

  return (
    <>
      <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className="mb-3 block w-full overflow-hidden rounded-2xl break-inside-avoid focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label={`Ampliar foto ${i + 1}`}
          >
            <Image
              src={src}
              alt={`${alt} — foto ${i + 1}`}
              width={800}
              height={1000}
              sizes="(min-width: 768px) 33vw, 50vw"
              className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {open != null ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <Image
            src={photos[open]}
            alt={`${alt} — foto ${open + 1}`}
            width={1600}
            height={2000}
            sizes="100vw"
            className="max-h-[88vh] w-auto rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button type="button" onClick={close} className="absolute right-4 top-4 text-3xl text-white" aria-label="Cerrar">
            ×
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(-1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white"
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white"
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
