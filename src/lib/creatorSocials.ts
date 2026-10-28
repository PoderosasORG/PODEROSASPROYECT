// Redes personales de cada creadora para mostrar en su propio perfil
// (distinto del footer general, que usa las cuentas de marca @katyshei).
// Si una no tiene alguna red, simplemente no se muestra ese ícono.
export type CreatorSocials = {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
};

export const CREATOR_SOCIALS: Record<string, CreatorSocials> = {
  luz: {
    tiktok: "https://www.tiktok.com/@consejos_deluz",
  },
  kat: {
    instagram: "https://www.instagram.com/kat_rivera_",
    tiktok: "https://www.tiktok.com/@kat_rivera_",
    facebook: "https://www.facebook.com/share/1THuDpBDgZ/?mibextid=wwXIfr",
  },
  shei: {
    tiktok: "https://www.tiktok.com/@sheirivera1",
  },
};
