import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EventTicketForm } from "@/components/EventTicketForm";
import { ProfileCard } from "@/components/ProfileCard";
import { FaqAccordion } from "@/components/cursos/FaqAccordion";
import { stripHtml } from "@/lib/panel/sanitize";

export const dynamic = "force-dynamic";

// Mismo patrón que src/app/page.tsx y la página del curso para las 3
// creadoras — se duplica aquí porque esta página necesita sus propias
// tarjetas, con fotos y bios reales.
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
    bio: "Psicóloga | Estratega digital y creadora de contenido",
  },
  luz: {
    name: "Luz",
    role: "Poderosa",
    bio: "Experiencia y sabiduría al servicio de la comunidad, con herramientas propias.",
  },
};

export default async function EventoPage() {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: product } = await admin
    .from("products")
    .select("id, title, description, price_cents, currency, capacity")
    .eq("type", "event")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-serif text-2xl">Todavía no hay un evento publicado</h1>
      </div>
    );
  }

  const price = (product.price_cents / 100).toLocaleString("es-CO", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  });

  const { data: creatorsData } = await supabase
    .from("creators")
    .select("slug, display_name, bio, short_bio, avatar_url")
    .eq("is_active", true)
    .in("slug", CREATOR_ORDER);

  const profiles = CREATOR_ORDER.map((slug) => {
    const defaults = CREATOR_DEFAULTS[slug];
    const creator = creatorsData?.find((c) => c.slug === slug);
    return {
      slug,
      name: creator?.display_name || defaults.name,
      role: defaults.role,
      bio:
        (creator?.short_bio ? stripHtml(creator.short_bio) : "") ||
        (creator?.bio ? stripHtml(creator.bio) : "") ||
        defaults.bio,
      initials: (creator?.display_name || defaults.name).charAt(0).toUpperCase(),
      avatarUrl: creator?.avatar_url ?? null,
    };
  });

  const temas = [
    {
      title: "¿Quién soy?",
      desc: "Un espacio para reconocer tu historia, explorar lo que sientes y comprender mejor quién eres hoy.",
    },
    {
      title: "¿Qué quiero?",
      desc: "Actividades para conectar con tus deseos, identificar tus prioridades y reconocer qué es importante para ti en esta etapa de tu vida.",
    },
    {
      title: "¿Cómo lo hago posible?",
      desc: "Herramientas para empezar a convertir tus ideas y deseos en decisiones y pequeños pasos concretos.",
    },
  ];

  const experiencia = [
    {
      title: "Actividades y experiencias",
      desc: "Dinámicas guiadas, ejercicios de reflexión y espacios para compartir con otras participantes.",
    },
    {
      title: "Coffee break",
      desc: "Un momento para hacer una pausa, disfrutar de un refrigerio y conversar en un ambiente cálido y agradable.",
    },
    {
      title: "Regalos especiales",
      desc: "Detalles y recursos preparados para las mujeres que harán parte de este primer encuentro.",
    },
  ];

  const faqs = [
    {
      q: "¿Necesito tener conocimientos previos para asistir?",
      a: "No. Es una introducción práctica a los fundamentos de la Metodología Poderosa, abierta a cualquier mujer que quiera hacer una pausa y trabajar en sí misma, sin experiencia previa.",
    },
    {
      q: "¿Qué incluye el valor de la entrada?",
      a: "Tu entrada a la masterclass presencial de cuatro horas, las actividades guiadas, el coffee break y los regalos especiales del evento.",
    },
    {
      q: "¿Dónde se realizará el evento?",
      a: "En el Edificio Emprendu, Calle 85 #12-66, Bogotá.",
    },
    {
      q: "¿A qué hora debo llegar?",
      a: "El evento inicia a las 9:00 a. m. y termina a la 1:00 p. m. Te recomendamos llegar con unos minutos de anticipación para el registro.",
    },
    {
      q: "¿Cómo recibiré mi confirmación o boleto?",
      a: "Al correo que registres en el formulario de compra.",
    },
    {
      q: "¿Puedo asistir con una amiga?",
      a: "Sí. Cada persona necesita su propia entrada; pueden comprarlas por separado y asistir juntas.",
    },
    {
      q: "¿Qué debo llevar?",
      a: "Por ahora este detalle está por confirmar — lo compartiremos antes del evento con quienes ya tengan su entrada.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-beige-light">
      {/* 1. Portada — fondo oscuro como recurso de contraste para esta
          sección únicamente; el resto de la página transiciona a los
          tonos crema/marfil de la marca. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#211c30] via-[#2b2440] to-beige-light px-6 pt-20 pb-24">
        <div className="relative max-w-xl mx-auto flex flex-col items-center text-center gap-5">
          <span className="uppercase tracking-[0.3em] text-xs text-gold-light font-medium">
            Masterclass presencial · Poderosa
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-white text-center">
            Un espacio para escucharte, descubrirte y conectar.
          </h1>
          <p className="max-w-lg text-white/80 text-lg">
            Un encuentro para escucharte, descubrir qué quieres y conectar con otras mujeres en
            una experiencia de reflexión, aprendizaje y conexión.
          </p>
          <p className="text-sm uppercase tracking-wide text-gold-light">
            ¿Quién soy? · ¿Qué quiero? · ¿Cómo lo hago posible?
          </p>
          <p className="text-sm text-white/70">
            Actividades guiadas · Coffee break · Regalos especiales
          </p>
          <p className="text-sm text-white/70">Sábado 21 de noviembre · 9:00 a. m. – 1:00 p. m.</p>
          <p className="text-sm text-white/70">Edificio Emprendu · Calle 85 #12-66, Bogotá</p>

          <div className="mt-4 w-full max-w-sm rounded-2xl bg-white p-6 flex flex-col items-center gap-1 border border-gold-light/50">
            <p className="text-xs uppercase tracking-wide text-gold font-medium">
              Precio de lanzamiento
            </p>
            <p className="font-serif text-4xl text-foreground">{price}</p>
            <p className="text-sm text-foreground/60 text-center">
              Precio regular: $120.000 COP · 50% de descuento para los primeros compradores
            </p>
          </div>

          <a
            href="#entradas"
            className="mt-2 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Quiero reservar mi lugar
          </a>
        </div>
      </section>

      {/* 2. ¿Qué vas a vivir? */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-4">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            No vienes solamente a escuchar. Vienes a vivir una experiencia.
          </h2>
          <p className="text-foreground/70 max-w-xl">
            Hemos creado un espacio para que puedas hacer una pausa en medio de tu rutina,
            escucharte, explorar lo que realmente quieres y compartir con otras mujeres que
            también están en su propio proceso. Durante este encuentro recorreremos tres
            preguntas fundamentales:
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {temas.map((tema, index) => (
            <div
              key={tema.title}
              className="rounded-2xl bg-white p-6 flex flex-col gap-2 border border-gold-light/50"
            >
              <span className="font-serif text-3xl text-gold-light">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="font-serif text-xl text-foreground font-semibold">{tema.title}</p>
              <p className="text-sm text-foreground/60 leading-relaxed">{tema.desc}</p>
            </div>
          ))}
        </div>

        <p className="max-w-xl mx-auto text-center font-serif text-lg text-foreground mt-10">
          Un espacio para reflexionar, compartir y llevarte nuevas herramientas para seguir
          trabajando en ti.
        </p>
      </section>

      {/* 3. Más que una masterclass */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-4">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            También habrá espacio para disfrutar, conectar y compartir.
          </h2>
          <p className="text-foreground/70 max-w-xl">
            Queremos que esta mañana sea especial de principio a fin. Por eso hemos preparado
            detalles para que puedas disfrutar del encuentro, compartir con otras mujeres y
            llevarte recuerdos de esta primera experiencia Poderosa.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {experiencia.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2 text-center items-center"
            >
              <p className="font-serif text-lg text-foreground font-semibold">{item.title}</p>
              <p className="text-sm text-foreground/60 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Las mujeres detrás de Poderosa */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <div className="text-center flex flex-col gap-3">
            <h2 className="font-serif text-3xl sm:text-4xl">
              Tres mujeres, tres perspectivas, un encuentro.
            </h2>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Somos Kat, Sheina y Luz. Desde nuestras experiencias, conocimientos y trayectorias,
              hemos creado Poderosas como un espacio para acompañar a otras mujeres en sus
              procesos de autoconocimiento, claridad y crecimiento personal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {profiles.map((profile) => (
              <ProfileCard key={profile.slug} {...profile} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Entradas */}
      <section id="entradas" className="px-6 py-16 bg-white scroll-mt-10">
        <div className="max-w-sm mx-auto flex flex-col items-center text-center gap-3">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            Tu lugar en esta experiencia te está esperando.
          </h2>
          <p className="text-foreground/70">
            Sé parte de nuestro primer encuentro presencial y regálate una mañana para
            escucharte, compartir y conectar contigo.
          </p>

          <div className="mt-2 w-full rounded-2xl bg-beige-light p-6 border border-gold-light/60 flex flex-col items-center gap-1">
            <p className="text-xs uppercase tracking-wide text-gold font-medium">
              Precio de lanzamiento
            </p>
            <p className="font-serif text-4xl text-foreground">{price}</p>
            <p className="text-sm text-foreground/60 text-center">
              Precio regular: $120.000 COP · 50% de descuento para los primeros compradores
            </p>
          </div>

          <p className="text-sm text-foreground/60 mt-1">
            Una sola entrada para vivir una experiencia presencial de cuatro horas, con
            actividades guiadas, coffee break y regalos especiales.
          </p>

          <div className="mt-4 w-full">
            <EventTicketForm productId={product.id} />
          </div>
        </div>
      </section>

      {/* 6. Preguntas frecuentes */}
      <section className="px-6 py-16">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <p className="text-center text-sm uppercase tracking-wide text-gold font-medium">
            Preguntas frecuentes
          </p>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 pb-20">
        <div className="max-w-sm mx-auto flex flex-col items-center text-center gap-3">
          <p className="font-serif text-xl text-foreground">
            Regálate esta mañana para volver a ti.
          </p>
          <a
            href="#entradas"
            className="rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Quiero reservar mi lugar
          </a>
        </div>
      </section>
    </div>
  );
}
