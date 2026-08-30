// Dimensiones de los lienzos del panel personalizable.
// Cada vista (teléfono / PC) tiene su propio lienzo y sus propias
// posiciones guardadas en %, para que no se estorben entre sí.
export const MOBILE_CANVAS = { width: 420, height: 640 };
export const DESKTOP_CANVAS = { width: 1200, height: 520 };
export const COVER_HEIGHT = { mobile: 160, desktop: 260 };

export type Device = "mobile" | "desktop";

export type Position = { x: number; y: number };

export type DevicePosition = {
  mobile: Position;
  desktop: Position;
};

export type TextStyle = {
  bold: boolean;
  italic: boolean;
  fontSize: number;
  color: string;
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  bold: false,
  italic: false,
  fontSize: 16,
  color: "#2A2420",
};

export type PanelBlock = {
  id: string;
  block_type: "image" | "video" | "text" | "product";
  media_url: string | null;
  product_id: string | null;
  text_content: string | null;
  text_style: TextStyle | null;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  device: Device;
  // Solo presentes cuando block_type = "product": los rellena la
  // página al leer el producto referenciado, no se guardan en el bloque.
  product_title?: string;
  product_price?: string;
  product_cover?: string | null;
};

export type BioStyle = {
  bold: boolean;
  italic: boolean;
  fontSize: number;
};

export type Theme = {
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: "serif" | "sans" | "rounded";
};

export const FONT_STACKS: Record<Theme["fontFamily"], string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  rounded: "Verdana, 'Trebuchet MS', sans-serif",
};

export const FONT_OPTIONS: { label: string; value: Theme["fontFamily"] }[] = [
  { label: "Serif elegante", value: "serif" },
  { label: "Sans moderna", value: "sans" },
  { label: "Redondeada", value: "rounded" },
];

export const DEFAULT_THEME: Theme = {
  bgColor: "#FDF6EE",
  textColor: "#2A2420",
  accentColor: "#C9A24B",
  fontFamily: "serif",
};

export const DEFAULT_BIO_STYLE: BioStyle = {
  bold: false,
  italic: false,
  fontSize: 14,
};

// Antes de la vista móvil/PC separada, avatar_position/bio_position
// guardaban un solo {x,y}. Esto sostiene datos viejos que aún no
// hayan pasado por la migración v2.
export function normalizeDevicePosition(
  pos: DevicePosition | Position | null | undefined,
  fallback: DevicePosition,
): DevicePosition {
  if (pos && "mobile" in pos && "desktop" in pos) return pos as DevicePosition;
  const flat = pos as Position | null | undefined;
  return { mobile: flat ?? fallback.mobile, desktop: flat ?? fallback.desktop };
}
