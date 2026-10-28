import type { Metadata } from "next";
import { Playfair_Display, Poppins, Dancing_Script, Cormorant_Garamond, Quicksand, Italiana } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
const dancingScript = Dancing_Script({ variable: "--font-dancing-script", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "600"] });
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], weight: ["400", "500", "700"] });
const italiana = Italiana({ variable: "--font-italiana", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Poderosas | Comunidad y metodología de transformación personal",
  description:
    "Poderosas es una comunidad de mujeres que quieren crecer. Herramientas, cursos y acompañamiento para pasar de la confusión a la acción.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${poppins.variable} ${dancingScript.variable} ${cormorant.variable} ${quicksand.variable} ${italiana.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
