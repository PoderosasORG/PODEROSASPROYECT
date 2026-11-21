import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/panel",
        "/api/",
        "/pago",
        "/auth",
        "/mis-compras",
        "/preferencias",
        "/actualizar-contrasena",
        "/recuperar",
        "/login",
        "/registro",
        "/escaner",
        "/cuotas",
      ],
    },
    sitemap: "https://poderosas.org/sitemap.xml",
  };
}
