import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Link corto para compartir en redes/anuncios: lleva directo al precio
  // y al formulario de compra, sin pasar por el resto de la página.
  async redirects() {
    return [
      {
        source: "/comprar",
        destination: "/evento#entradas",
        permanent: false,
      },
    ];
  },
  experimental: {
    // Sin esto, Next.js guarda en caché del navegador las páginas
    // dinámicas (como /[slug]) por ~30s al navegar con <Link>, así
    // que los cambios guardados en el panel no se veían de inmediato.
    staleTimes: {
      dynamic: 0,
    },
    // Facturas que se suben en /admin/gastos (PDF o foto). Vercel corta
    // los cuerpos de más de 4,5 MB, así que 4 MB deja margen.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
