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
          Copy final entregado por el usuario, montado tal cual. */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 px-6">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Próximamente · Curso virtual
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight">
            Deja de dar vueltas. Empieza a construir una vida que se sienta tuya.
          </h2>
          <p className="text-foreground/70 max-w-xl font-medium">
            Un método práctico para entender lo que sientes, descubrir lo que
            realmente quieres y empezar a convertirlo en realidad.
          </p>
          <p className="text-foreground/70 max-w-xl">
            A veces sabes que quieres algo diferente, pero no sabes por dónde
            empezar. O tienes tantas ideas, dudas y expectativas encima que
            terminas dejando para después lo que de verdad importa.
          </p>
          <p className="text-foreground/70 max-w-xl">
            Metodología Poderosa te ayuda a poner en orden tus pensamientos,
            reconectar contigo y transformar tus deseos en pasos concretos
            que puedas llevar a tu vida real.
          </p>
          <p className="text-foreground/70 max-w-xl font-medium">
            No se trata de convertirte en otra persona. Se trata de aprender
            a elegir tu propio camino.
          </p>
          <a
            href="#lista-espera-curso"
            className="mt-2 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Quiero ser parte de Poderosas
          </a>
        </div>

        <div className="max-w-xl mx-auto mt-20 flex flex-col gap-4 px-6">
          <h3 className="font-serif text-2xl text-center mb-2">
            ¿Sientes que quieres cambiar algo, pero no sabes cómo empezar?
          </h3>
          {[
            "Tienes ganas de hacer algo diferente, pero no consigues identificar qué es lo que realmente quieres.",
            "Empiezas proyectos, haces planes y te llenas de motivación, pero te cuesta mantener el rumbo.",
            "Te descubres tomando decisiones pensando en lo que esperan los demás, en lugar de preguntarte qué quieres tú.",
            "Consumes consejos, guardas publicaciones y buscas respuestas, pero sigues sintiendo que necesitas ordenar tus ideas.",
            "Sabes que tienes cosas por hacer y sueños por cumplir, pero te cuesta convertirlos en acciones concretas.",
          ].map((pain) => (
            <p key={pain} className="flex gap-3 text-foreground/80">
              <span className="text-gold">✦</span>
              {pain}
            </p>
          ))}
          <p className="text-center text-foreground/70 mt-4">
            No necesitas tener toda tu vida resuelta para empezar. Necesitas
            un punto de partida y herramientas para avanzar.
          </p>
          <p className="text-center font-medium">
            No tienes que resolverlo todo de una vez. Empieza por ti.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-20 px-6">
          <p className="text-center text-foreground/70 max-w-2xl mx-auto mb-10">
            Metodología Poderosa es un curso virtual que te acompaña a
            recorrer tres pasos fundamentales para construir una vida más
            alineada con quien eres y con lo que quieres.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">01</span>
              <p className="font-serif text-lg">Reconoce quién eres</p>
              <p className="text-sm text-foreground/60">
                Comprende mejor lo que sientes, identifica tus necesidades y
                reconoce aquello que influye en tus decisiones.
              </p>
              <p className="text-sm text-foreground/60">
                <span className="font-medium text-foreground/80">Te llevas:</span>{" "}
                herramientas de autoconocimiento para entenderte mejor y
                empezar a escucharte con más intención.
              </p>
            </div>
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">02</span>
              <p className="font-serif text-lg">Descubre qué quieres</p>
              <p className="text-sm text-foreground/60">
                Distingue tus deseos de las expectativas externas, explora
                tus posibilidades y define qué es importante para ti en esta
                etapa de tu vida.
              </p>
              <p className="text-sm text-foreground/60">
                <span className="font-medium text-foreground/80">Te llevas:</span>{" "}
                mayor claridad sobre tus prioridades, tus valores y la
                dirección que quieres tomar.
              </p>
            </div>
            <div className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2">
              <span className="font-serif text-3xl text-gold-light">03</span>
              <p className="font-serif text-lg">Convierte tus deseos en acciones</p>
              <p className="text-sm text-foreground/60">
                Pasa de las ideas a los pasos concretos. Aprende a organizar
                tus objetivos, tomar decisiones y construir una forma de
                avanzar que puedas sostener en tu día a día.
              </p>
              <p className="text-sm text-foreground/60">
                <span className="font-medium text-foreground/80">Te llevas:</span>{" "}
                ejercicios y herramientas prácticas para empezar a
                materializar lo que quieres.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto mt-20 flex flex-col gap-4 px-6">
          <h3 className="font-serif text-2xl text-center mb-2">
            ¿Qué vas a conseguir con Metodología Poderosa?
          </h3>
          <p className="text-center text-foreground/70">
            Al finalizar el recorrido, habrás trabajado para:
          </p>
          {[
            "Entenderte mejor: reconocer qué sientes, qué necesitas y qué quieres cambiar.",
            "Tomar decisiones con más claridad: identificar tus prioridades y evaluar qué tiene sentido para ti.",
            "Dejar de acumular ideas sin rumbo: convertir tus deseos en objetivos y próximos pasos.",
            "Reconocer lo que te frena: explorar patrones y expectativas que pueden estar dificultando tu avance.",
            "Construir un plan propio: definir acciones realistas que puedas empezar a aplicar en tu vida cotidiana.",
          ].map((item) => (
            <p key={item} className="flex gap-3 text-foreground/80">
              <span className="text-gold">✦</span>
              {item}
            </p>
          ))}
          <p className="text-center text-foreground/70 mt-4">
            No necesitas tener todas las respuestas antes de empezar. El
            proceso está diseñado para ayudarte a encontrarlas y trabajar
            con ellas paso a paso.
          </p>
        </div>

        <div className="max-w-xl mx-auto mt-20 flex flex-col gap-4 px-6 text-center">
          <p className="font-serif text-2xl">
            No es solo información. Es un proceso para llevar a tu vida.
          </p>
          <p className="text-foreground/70">
            El curso incluye una cartilla descargable y ejercicios prácticos
            para acompañar cada módulo.
          </p>
          <p className="text-foreground/70">
            Porque leer una idea inspiradora puede hacerte reflexionar
            durante unos minutos. Trabajarla, escribir tus respuestas y
            llevarla a tu realidad te permite convertir esa reflexión en
            algo útil para ti.
          </p>
          <p className="text-foreground/70">
            Tendrás herramientas para explorar lo que sientes, aclarar lo
            que quieres y definir cómo empezar a actuar.
          </p>
          <p className="text-foreground/70 mt-4">
            Tu próximo capítulo no tiene que empezar cuando tengas todo
            resuelto.
          </p>
          <p className="text-foreground/70">
            Puede empezar cuando decidas dedicarte un espacio para
            escucharte, reconocer lo que necesitas y dar un primer paso.
          </p>
          <p className="font-medium">
            Metodología Poderosa es una invitación a dejar de vivir en
            automático y empezar a construir, con intención, una vida más
            tuya.
          </p>
          <a
            href="#lista-espera-curso"
            className="mt-2 self-center rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Quiero recibir información del lanzamiento
          </a>
        </div>

        <div
          id="lista-espera-curso"
          className="max-w-xl mx-auto mt-20 flex flex-col items-center gap-5 px-6 text-center scroll-mt-16"
        >
          <h3 className="font-serif text-2xl">Inscríbete en la lista de espera</h3>
          <p className="text-foreground/70">
            Déjanos tu correo para recibir información cuando abramos las
            inscripciones.
          </p>
          <p className="text-sm text-foreground/70">
            Además, por apuntarte primero, podrás acceder a:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="rounded-2xl border border-gold-light/60 p-5">
              <p className="text-2xl">🎁</p>
              <p className="text-sm font-medium mt-1">30% de descuento</p>
              <p className="text-xs text-foreground/60">en los eventos presenciales de Poderosas</p>
            </div>
            <div className="rounded-2xl border border-gold-light/60 p-5">
              <p className="text-2xl">📘</p>
              <p className="text-sm font-medium mt-1">Un ebook de regalo</p>
              <p className="text-xs text-foreground/60">cuando abramos las inscripciones al curso</p>
            </div>
          </div>
          <p className="text-xs text-foreground/50 max-w-sm">
            Beneficios exclusivos para quienes se inscriban en la lista de
            espera, sujetos a las condiciones que se comuniquen en el
            lanzamiento.
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
