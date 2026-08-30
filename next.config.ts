import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Sin esto, Next.js guarda en caché del navegador las páginas
    // dinámicas (como /[slug]) por ~30s al navegar con <Link>, así
    // que los cambios guardados en el panel no se veían de inmediato.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
