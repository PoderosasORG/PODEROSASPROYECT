import type { MetadataRoute } from "next";

const SITE = "https://poderosas.org";

// Solo páginas públicas. Panel, admin, pagos y cuentas quedan fuera.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cursos/metodologia-poderosa`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/evento`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/luz`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/shei`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/kat`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
