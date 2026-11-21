// ID de medición de Google Analytics 4 de Poderosas (no es secreto: va
// embebido en el HTML de cualquier sitio que lo usa).
export const GA_MEASUREMENT_ID = "G-EN3BCEYTZE";

// Meta Pixel: solo se activa si se configura en Vercel
// (NEXT_PUBLIC_META_PIXEL_ID) y la visitante acepta cookies de publicidad.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
