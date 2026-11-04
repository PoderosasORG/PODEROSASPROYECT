import { notFound } from "next/navigation";
import { WaitlistForm } from "@/components/WaitlistForm";

// Página placeholder para material descargable gratuito que todavía no
// está subido (ebooks, plantillas). Cuando el archivo exista de verdad,
// esto se reemplaza por la descarga real — por ahora solo junta correos
// interesados en la lista de espera de recursos.
const RESOURCES: Record<string, { title: string; desc: string }> = {
  "ebook-relaciones": {
    title: "Ebook de relaciones de pareja",
    desc: "Un recurso para profundizar en el mundo de las relaciones, parte de Metodología Poderosa.",
  },
  "plantillas-bienestar": {
    title: "10 plantillas de bienestar emocional",
    desc: "Herramientas descargables para acompañar tus procesos de reflexión y autoconocimiento.",
  },
};

export default async function RecursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = RESOURCES[slug];
  if (!resource) notFound();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-beige-light px-6 py-24 text-center gap-5">
      <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
        Material descargable · Próximamente
      </span>
      <h1 className="font-serif text-3xl sm:text-4xl max-w-lg">{resource.title}</h1>
      <p className="text-foreground/70 max-w-md">
        Este recurso se está preparando. Déjanos tu correo y te avisamos apenas esté listo para
        descargar.
      </p>
      <WaitlistForm source={`recurso-${slug}`} />
    </div>
  );
}
