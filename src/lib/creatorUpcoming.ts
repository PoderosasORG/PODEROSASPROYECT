// Productos "Próximamente" de cada mentora (pedido de Kat, 2026-11-20).
// Se muestran en su perfil como tarjetas de próximo lanzamiento, todavía
// sin compra. Cuando un producto exista de verdad (subido desde el panel),
// se quita de esta lista y aparece solo con su botón de compra.
export type UpcomingProduct = { kicker: string; title: string; desc?: string; tone: string };

const PINK = "from-[#fbe4ec] via-[#f7c9d8] to-[#f2a0bf]";
const LAVENDER = "from-[#f3ecfa] via-[#e7dcf5] to-[#c9b3e6]";
const GOLD = "from-[#fbf3e6] via-[#f3e4cf] to-[#e0b384]";
const PLUM = "from-[#74173f] via-[#5c1030] to-[#2b0f1d]";

export const UPCOMING_BY_CREATOR: Record<string, UpcomingProduct[]> = {
  luz: [
    { kicker: "Curso para principiantes", title: "Lectura de las líneas de las manos", tone: GOLD },
    { kicker: "Libro", title: "Manópolis: las manos y la física cuántica para conocer quiénes somos", tone: PLUM },
    {
      kicker: "Sesión privada",
      title: "Análisis e informe completo de tu energía",
      desc: "Eneagramas, biorritmos, alineación de los centros energéticos (chakras) y más.",
      tone: LAVENDER,
    },
    { kicker: "Sesión privada", title: "Lectura de las líneas de las manos", tone: PINK },
    { kicker: "Sesión privada", title: "Lectura del rostro", tone: GOLD },
  ],
  shei: [{ kicker: "Reto de 7 días", title: "Enfócate en ti y fortalece tu amor propio", tone: PINK }],
  kat: [
    { kicker: "Masterclass", title: "Crea tu marca personal, monetiza y construye una comunidad PODEROSA", tone: LAVENDER },
    { kicker: "Reto de 7 días", title: "Organiza tu vida", tone: GOLD },
  ],
};
