import Link from "next/link";
import { ProfileCard } from "@/components/ProfileCard";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/panel/sanitize";

const CREATOR_ORDER = ["luz", "shei", "kat"];

const CREATOR_DEFAULTS: Record<string, { name: string; role: string; bio: string }> = {
  kat: {
    name: "Kat",
    role: "Poderosa",
    bio: "Creadora de la metodología Poderosas: claridad, decisión y acción para mujeres que quieren cambiar de vida.",
  },
  shei: {
    name: "Shei",
    role: "Poderosa",
    bio: "Contenido y productos digitales enfocados en crecimiento personal y bienestar.",
  },
  luz: {
    name: "Luz",
    role: "Poderosa",
    bio: "Experiencia y sabiduría al servicio de la comunidad, con herramientas propias.",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data: creators } = await supabase
    .from("creators")
    .select("slug, display_name, bio, avatar_url")
    .eq("is_active", true)
    .in("slug", CREATOR_ORDER);

  const profiles = CREATOR_ORDER.map((slug) => {
    const defaults = CREATOR_DEFAULTS[slug];
    const creator = creators?.find((c) => c.slug === slug);
    return {
      slug,
      name: creator?.display_name || defaults.name,
      role: defaults.role,
      bio: (creator?.bio ? stripHtml(creator.bio) : "") || defaults.bio,
      initials: (creator?.display_name || defaults.name).charAt(0).toUpperCase(),
      avatarUrl: creator?.avatar_url ?? null,
    };
  });

  return (
    <div className="flex flex-col flex-1 bg-beige-light">
      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <div className="w-full aspect-[8/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/creators/landing-hero.webp"
            alt="Luz, Shei y Kat, las Poderosas"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col items-center gap-6 px-6 pt-10 pb-20 sm:pb-28 max-w-2xl">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Comunidad · Metodología · Transformación
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl leading-tight">
            Mentoras de mujeres poderosas
          </h1>
          <p className="max-w-xl text-foreground/70 text-lg">
            Poderosas es una comunidad de mujeres que quieren crecer, pero muchas
            veces saben que necesitan cambiar algo y no saben por dónde empezar.
            Creamos un método práctico para ordenar lo que sienten, definir lo
            que quieren y convertirlo en pasos concretos.
          </p>
          <a
            href="#creadoras"
            className="rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Conoce a las Poderosas
          </a>
        </div>
      </section>

      {/* Masterclass presencial — fondo oscuro, listo para una foto más adelante
          (hoy es un degradado; para ponerle una imagen basta con agregar un
          <img> absoluto dentro de este div, igual que en el hero de arriba) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#161421] via-[#1d1b2e] to-[#262244] px-6 py-20">
        <div className="relative max-w-2xl mx-auto flex flex-col items-center text-center gap-4">
          <span className="uppercase tracking-[0.3em] text-xs text-gold-light font-medium">
            Masterclass presencial · Poderosa
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl leading-tight text-white">
            Es momento de elegirte.
          </h2>
          <p className="max-w-xl text-white/80">
            Descubre quién eres, conecta con lo que realmente quieres y
            encuentra herramientas para empezar a alcanzar eso que llevas
            tanto tiempo posponiendo.
          </p>
          <p className="text-sm uppercase tracking-wide text-gold-light">
            ¿Quién soy? · ¿Qué quiero? · ¿Cómo lo hago posible?
          </p>
          <p className="text-sm text-white/70">
            Actividades guiadas · Brunch · Regalos especiales
          </p>
          <p className="text-sm text-white/70">
            21 de noviembre · 9:00 a.m. – 1:00 p.m.
          </p>
          <p className="text-sm text-white/70">
            Edificio Emprendu · Calle 85 #12-66, Bogotá
          </p>

          <div className="mt-4 w-full max-w-sm rounded-2xl bg-beige-light p-6 flex flex-col items-center gap-1">
            <p className="text-xs uppercase tracking-wide text-gold font-medium">
              Precio especial · quedan pocos cupos
            </p>
            <p className="font-serif text-4xl text-foreground">$60.000 COP</p>
            <p className="text-sm text-foreground/60">
              Precio regular: $120.000 COP · 50% de descuento
            </p>
          </div>

          <Link
            href="/evento"
            className="mt-2 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Comprar mi entrada
          </Link>
        </div>
      </section>

      {/* La analogía del GPS */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center flex flex-col gap-6">
        <h2 className="font-serif text-4xl">El GPS de tu vida</h2>
        <p className="text-foreground/70">
          La mujer no necesita que le digan &ldquo;conduce más rápido&rdquo;.
          Necesita una ruta. Poderosas funciona como un GPS: identifica dónde
          estás, define a dónde quieres llegar, elige una ruta, avanza,
          revisa, recalcula cuando algo cambia y reconoce en quién te
          convertiste.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="rounded-2xl bg-white p-6 border border-gold-light/60">
            <p className="font-serif text-lg text-gold">Identificar</p>
            <p className="text-sm text-foreground/60 mt-2">
              Dónde estás y qué sientes hoy.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-gold-light/60">
            <p className="font-serif text-lg text-gold">Comprender</p>
            <p className="text-sm text-foreground/60 mt-2">
              Qué necesitas ordenar y priorizar.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-gold-light/60">
            <p className="font-serif text-lg text-gold">Aplicar</p>
            <p className="text-sm text-foreground/60 mt-2">
              El siguiente paso concreto, en acción.
            </p>
          </div>
        </div>
      </section>

      {/* Creadoras */}
      <section id="creadoras" className="px-6 py-24 bg-white/40">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <div className="text-center flex flex-col gap-3">
            <h2 className="font-serif text-4xl">Nuestras Poderosas</h2>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Tres mujeres, tres caminos, un mismo propósito: acompañarte con
              estructura, herramientas y comunidad. Cada una tiene su propio
              espacio con sus productos, cursos y experiencias.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {profiles.map((profile) => (
              <ProfileCard key={profile.slug} {...profile} />
            ))}
          </div>
        </div>
      </section>

      {/* Pitch final */}
      <section className="px-6 py-24 max-w-3xl mx-auto text-center flex flex-col gap-4">
        <h2 className="font-serif text-4xl">Lo que realmente ofrecemos</h2>
        <p className="text-foreground/70">
          No prometemos una vida perfecta ni cambios mágicos: entregamos
          estructura, conocimiento, herramientas y un impulso para empezar. A
          través de contenido, experiencias, cursos y comunidad, te
          acompañamos a identificar, comprender y aplicar.
        </p>
      </section>
    </div>
  );
}
