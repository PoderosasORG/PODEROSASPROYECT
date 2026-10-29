import Link from "next/link";
import { ProfileCard } from "@/components/ProfileCard";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/panel/sanitize";
import { getEventStats } from "@/lib/eventStats";
import { WaitlistForm } from "@/components/WaitlistForm";

const CREATOR_ORDER = ["luz", "kat", "shei"];

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
  const eventStats = await getEventStats();
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
              Precio especial
              {eventStats && eventStats.capacity
                ? ` · quedan ${Math.max(eventStats.capacity - eventStats.sold, 0)} cupos de ${eventStats.capacity}`
                : eventStats && eventStats.sold > 0
                  ? ` · ${eventStats.sold} ${eventStats.sold === 1 ? "persona ya se unió" : "personas ya se unieron"}`
                  : " · cupos limitados"}
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

      {/* Curso virtual — lista de espera, sin cobrar todavía.
          Estructura inspirada en páginas de venta de cursos que sí
          convierten (dolor → qué aprendes módulo a módulo → beneficios
          → CTA), adaptada a Poderosas: sin precio ni testimonios
          falsos porque el curso todavía no existe, solo lista de espera. */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 px-6">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Próximamente · Curso virtual
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight">
            No necesitas más fuerza de voluntad.
            <br />
            Necesitas un método que sí puedas sostener.
          </h2>
          <p className="text-foreground/70 max-w-xl">
            Metodología Poderosa es el curso virtual donde Kat, Shei y Luz te
            acompañan, cada una desde su área, a ordenar lo que sientes,
            definir lo que quieres y convertirlo en pasos que de verdad
            cumples.
          </p>
        </div>

        <div className="max-w-xl mx-auto mt-14 flex flex-col gap-4 px-6">
          <h3 className="font-serif text-2xl text-center mb-2">¿Te pasa esto?</h3>
          {[
            "Sabes que algo tiene que cambiar, pero no sabes por dónde empezar.",
            "Has intentado de todo — libros, videos, propósitos de año nuevo — y nada se queda.",
            "Tomas una decisión un lunes y para el viernes ya la abandonaste.",
            "Buscas claridad en redes sociales y terminas con más ruido, no menos.",
          ].map((pain) => (
            <p key={pain} className="flex gap-3 text-foreground/80">
              <span className="text-gold">✦</span>
              {pain}
            </p>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-16 px-6">
          <h3 className="font-serif text-2xl text-center mb-10">
            Así funciona Metodología Poderosa
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">01</span>
              <p className="font-serif text-lg">Kat — Identificar</p>
              <p className="text-sm text-foreground/60">
                Comunicación y estrategia digital: cómo nombrar lo que
                quieres contarle al mundo y construir una voz propia, sin
                perderte en lo que &ldquo;deberías&rdquo; mostrar.
              </p>
            </div>
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">02</span>
              <p className="font-serif text-lg">Shei — Comprender</p>
              <p className="text-sm text-foreground/60">
                Psicología y bienestar: qué hay detrás de lo que sientes,
                para dejar de repetir patrones que ya no te sirven.
              </p>
            </div>
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">03</span>
              <p className="font-serif text-lg">Luz — Aplicar</p>
              <p className="text-sm text-foreground/60">
                Autoconocimiento y energía: cómo sostener el cambio en el
                tiempo, con herramientas prácticas para el día a día.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-foreground/60 mt-8">
            Incluye cartilla descargable y entregables prácticos para cada
            módulo — para aplicar lo que aprendes, no solo verlo.
          </p>
        </div>

        <div className="max-w-xl mx-auto mt-16 flex flex-col items-center gap-5 px-6 text-center">
          <h3 className="font-serif text-2xl">Por inscribirte primero, te llevas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="rounded-2xl border border-gold-light/60 p-5">
              <p className="text-2xl">🎁</p>
              <p className="text-sm font-medium mt-1">30% de descuento</p>
              <p className="text-xs text-foreground/60">en todos los eventos presenciales</p>
            </div>
            <div className="rounded-2xl border border-gold-light/60 p-5">
              <p className="text-2xl">📘</p>
              <p className="text-sm font-medium mt-1">Un ebook de regalo</p>
              <p className="text-xs text-foreground/60">al abrir las inscripciones</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-wide text-gold font-medium mt-2">
            Solo para quienes se inscriban primero en la lista de espera
          </p>
          <WaitlistForm source="curso-metodologia-poderosa" />
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

      {/* Podcast — la foto (Kat y Shei, Shei señalando hacia arriba)
          va justo debajo de este texto, así el gesto apunta hacia él. */}
      <section className="px-6 py-24 bg-[#161421] text-center flex flex-col items-center gap-5">
        <span className="uppercase tracking-[0.3em] text-xs text-gold-light font-medium">
          Nuestro podcast
        </span>
        <h2 className="font-serif text-4xl text-white">Deje la Pendejada</h2>
        <p className="max-w-md text-white/70">
          Kat y Shei, hermanas, hablando sin filtro de lo que de verdad
          importa. Escúchalo en YouTube o Spotify.
        </p>
        <div className="flex gap-3">
          <a
            href="https://www.youtube.com/@katyshei/podcasts"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-6 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            Ver en YouTube
          </a>
          <a
            href="https://open.spotify.com/show/4VyjQArqu6NvuF5LOB6R2V"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-6 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            Ver en Spotify
          </a>
        </div>
        <a
          href="https://www.youtube.com/@katyshei/podcasts"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full max-w-xs overflow-hidden rounded-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/creators/podcast-deje-la-pendejada.jpg"
            alt="Kat y Shei, Deje la Pendejada — ver podcast"
            className="w-full h-auto hover:scale-[1.02] transition-transform"
          />
        </a>
      </section>
    </div>
  );
}
