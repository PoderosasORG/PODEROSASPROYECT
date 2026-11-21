import type { Metadata } from "next";
import Script from "next/script";
import { Playfair_Display, Poppins, Dancing_Script, Cormorant_Garamond, Quicksand, Italiana } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/config";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";
import "./globals.css";



const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Tipografías extra para la personalización del panel de cada creadora
// (pedido explícito: opciones más femeninas/soft/estéticas).
// preload: false → no se descargan en cada página; solo cuando un perfil
// realmente usa esa tipografía (ahorra peso en la home y el curso).
const dancingScript = Dancing_Script({ variable: "--font-dancing-script", subsets: ["latin"], preload: false });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "600"], preload: false });
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], weight: ["400", "500", "700"], preload: false });
const italiana = Italiana({ variable: "--font-italiana", subsets: ["latin"], weight: "400", preload: false });

const SITE_DESCRIPTION =
  "PODEROSAS es una comunidad de mujeres que quieren crecer. Herramientas, cursos y acompañamiento para pasar de la confusión a la acción.";

// Imagen de las tres mentoras (Kat, Shei y Luz) — es la que debe salir en
// la vista previa cuando se comparte cualquier link del sitio por
// WhatsApp/Instagram, para que no salga la cara de una sola de ellas.
const SITE_OG_IMAGE = "/images/creators/landing-hero.webp";

export const metadata: Metadata = {
  metadataBase: new URL("https://poderosas.org"),
  title: "PODEROSAS | Comunidad y metodología de transformación personal",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "PODEROSAS | Comunidad y metodología de transformación personal",
    description: SITE_DESCRIPTION,
    siteName: "PODEROSAS",
    images: [{ url: SITE_OG_IMAGE }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PODEROSAS | Comunidad y metodología de transformación personal",
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${poppins.variable} ${dancingScript.variable} ${cormorant.variable} ${quicksand.variable} ${italiana.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            // Modo de consentimiento: la analítica básica funciona, la
            // publicidad queda apagada hasta que la visitante acepte.
            gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
            try { if (localStorage.getItem('pod_consent') === 'all') gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }); } catch (e) {}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <SiteHeader />
        {children}
        <SiteFooter />
        <ConsentBanner />
      </body>
    </html>
  );
}
