// Fotos de respaldo mientras cada creadora no haya subido las suyas
// propias desde el panel. Si `avatar_url`/`cover_image_url` ya tienen
// un valor real en la base de datos, esas mandan — esto nunca las pisa.
export const CREATOR_FALLBACK_PHOTOS: Record<string, string> = {
  kat: "/images/creators/kat.jpg",
  shei: "/images/creators/shei.webp",
  luz: "/images/creators/luz.png",
};
