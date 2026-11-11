"use client";

import { useRef, useState } from "react";

// Cuadro con el video de presentación de las tres (Kat, Shei, Luz) en el
// home, pedido por la usuaria. Empieza pausado con una miniatura — no
// autoplay, para no pesar la carga inicial de la página ni sorprender con
// sonido; se reproduce al hacer clic.
export function IntroVideoCard({ videoUrl, posterUrl }: { videoUrl: string; posterUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    videoRef.current?.play();
  }

  return (
    <div className="bg-beige-light px-6 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto w-full">
        <div
          className="relative w-full aspect-video overflow-hidden rounded-2xl shadow-xl border border-gold-light/40 bg-black"
          onClick={!playing ? handlePlay : undefined}
          role={!playing ? "button" : undefined}
          aria-label={!playing ? "Reproducir video de presentación de PODEROSAS" : undefined}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl}
            controls={playing}
            playsInline
            preload="none"
            className="w-full h-full object-cover cursor-pointer"
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-10 sm:h-10 text-gold ml-1" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
