import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EventTicketForm } from "@/components/EventTicketForm";
import { FaqAccordion } from "@/components/cursos/FaqAccordion";
import { stripHtml } from "@/lib/panel/sanitize";

export const dynamic = "force-dynamic";

// Landing según el brief "Brief_Landing_Masterclass_PODEROSAS_2026_para_Claude.pdf"
// que trajo la usuaria. Textos y estructura tomados tal cual del documento;
// donde el brief marca algo como pendiente de confirmar (fecha límite del
// precio de preventa, instrucciones de transferencia bancaria, detalle exacto
// del "acceso al lanzamiento del curso", políticas de cambios/devoluciones,
// aforo), NO se inventó nada — queda listado al final de este archivo y se
// le avisa a la usuaria en el chat.
const CREATOR_ORDER = ["kat", "shei", "luz"];
const CREATOR_DEFAULTS: Record<string, { name: string; tagline: string; bio: string }> = {
  kat: {
    name: "Kat Rivera",
    tagline: "Ejecución, productividad y PNL",
    bio: "Convertir claridad en acción: objetivos, prioridades, tiempo, procrastinación y un plan realista para avanzar.",
  },
  shei: {
    name: "Shei",
    tagline: "Psicología, emociones y autoconocimiento",
    bio: "Explorar emociones, comprender experiencias y profundizar en el conocimiento de ti misma.",
  },
  luz: {
    name: "Luz Amparo",
    tagline: "Energía y Bio-Well",
    bio: "Una mirada de conciencia energética y exploración personal a través de su experiencia con Bio-Well.",
  },
};

const PARA_TI_SI = [
  "Sientes que tienes talentos, habilidades y potencial, pero no sabes convertirlos en un camino claro.",
  "Tienes sueños, ideas o proyectos que te ilusionan, pero te cuesta pasar de pensarlos a ejecutarlos.",
  "Quieres un cambio, pero no sabes por dónde empezar ni cómo organizar los pasos.",
  "Te cuesta mantener el enfoque, priorizar y terminar lo que comienzas.",
  "Atiendes responsabilidades y necesidades de los demás, mientras te dejas para después.",
  "Quieres reconocer tus fortalezas, conectar con tu propósito y encontrar una dirección con sentido.",
  "Deseas tomar decisiones con más confianza y que el miedo, la culpa o la inseguridad no decidan por ti.",
  "Quieres fortalecer tu autoestima, reconocer tu valor y priorizarte sin sentir culpa.",
  "Quieres escuchar tu cuerpo, comprender mejor tus emociones y reconocer qué necesitas para cuidar tu bienestar.",
  "Tienes conversaciones, decisiones o proyectos que llevas demasiado tiempo postergando.",
  "Quieres soltar expectativas ajenas y construir una vida coherente con quien eres y lo que deseas.",
  "Te gustaría conectar con mujeres comprometidas con su crecimiento personal y profesional.",
];

const VIVIR_Y_APRENDER = [
  {
    title: "Reconexión y autoconocimiento",
    desc: "Explorar quién eres hoy, reconocer fortalezas, valores, emociones y aquello que importa para ti.",
  },
  {
    title: "Propósito y dirección",
    desc: "Reflexionar sobre tus talentos, motivaciones y posibles caminos para alinear lo que quieres con lo que haces.",
  },
  {
    title: "Bienestar, energía y conciencia corporal",
    desc: "Acercarte a herramientas de observación y reflexión sobre cuerpo, emociones y energía.",
  },
  {
    title: "Decisiones y mentalidad",
    desc: "Identificar pensamientos que pueden frenarte y practicar nuevas formas de mirar tus retos.",
  },
  {
    title: "De la idea a la acción",
    desc: "Convertir deseos en objetivos, organizar prioridades, gestionar el tiempo y dar pasos concretos.",
  },
  {
    title: "Conexión entre mujeres",
    desc: "Compartir aprendizaje y conversación con otras mujeres que también están construyendo su camino.",
  },
];

const INCLUYE = [
  "Acceso presencial a la Masterclass PODEROSAS 2026 con las tres mentoras.",
  "Coffee break durante el encuentro.",
  "Materiales de trabajo para realizar ejercicios y llevarte tus reflexiones.",
  "Acceso al lanzamiento del Curso PODEROSAS (los detalles de este acceso se confirman antes del evento).",
];

const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

const FAQS = [
  {
    q: "¿Cuándo y dónde será?",
    a: "El 21 de noviembre de 2026, de 9:00 a. m. a 1:00 p. m., en la Calle 85 #12-66, Bogotá.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "El precio regular es $120.000 COP. Durante la preventa, las primeras compradoras pueden adquirirla por $60.000 COP, con 50% de descuento.",
  },
  {
    q: "¿Qué incluye?",
    a: "Masterclass con tres mentoras, coffee break, materiales de trabajo y acceso al lanzamiento del Curso PODEROSAS.",
  },
  {
    q: "¿Cómo puedo pagar?",
    a: "Por ahora, por la pasarela de pago en línea (tarjeta o PSE). Si necesitas pagar por transferencia bancaria, escríbenos a " +
      SUPPORT_EMAIL +
      " y te ayudamos.",
  },
  {
    q: "¿Puedo asistir si no conozco a nadie?",
    a: "¡Claro! Es un espacio para compartir, aprender y conectar con otras mujeres. Puedes venir sola y vivir la experiencia a tu ritmo.",
  },
  {
    q: "¿Necesito tener claro mi propósito antes de asistir?",
    a: "No. Puedes llegar con preguntas, inquietudes o ganas de encontrar una nueva dirección.",
  },
  {
    q: "¿La entrada incluye el curso completo?",
    a: "La entrada incluye acceso al lanzamiento del Curso PODEROSAS, no el curso completo. Si tienes dudas sobre qué significa exactamente ese acceso, escríbenos a " +
      SUPPORT_EMAIL +
      " antes de comprar.",
  },
  {
    q: "¿Cómo recibiré mi confirmación o boleto?",
    a: "Al correo que registres en el formulario de compra.",
  },
];

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

  const mentoras = CREATOR_ORDER.map((slug) => {
    const defaults = CREATOR_DEFAULTS[slug];
    const creator = creatorsData?.find((c) => c.slug === slug);
    return {
      slug,
      name: creator?.display_name || defaults.name,
      tagline: defaults.tagline,
      bio:
        (creator?.short_bio ? stripHtml(creator.short_bio) : "") ||
        (creator?.bio ? stripHtml(creator.bio) : "") ||
        defaults.bio,
      initials: (creator?.display_name || defaults.name).charAt(0).toUpperCase(),
      avatarUrl: creator?.avatar_url ?? null,
    };
  });

  return (
    <div className="flex flex-1 flex-col bg-beige-light pb-24">
      {/* 1. Portada / Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#542B45] via-[#6b3a58] to-beige-light px-6 pt-16 pb-20">
        <div className="relative max-w-xl mx-auto flex flex-col items-center text-center gap-5">
          <span className="uppercase tracking-[0.3em] text-xs text-gold-light font-medium">
            Masterclass presencial para mujeres · Bogotá
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl leading-tight text-white text-center">
            Reconoce la mujer poderosa que hay en ti.
          </h1>
          <p className="max-w-lg text-white/80 text-lg">
            Reconecta contigo, encuentra dirección y aprende a convertir tus sueños e ideas en
            acciones concretas para construir la vida que deseas.
          </p>

          {/* object-contain a propósito: esta foto es un banner panorámico
              (recortada con object-cover se cortaba la cara de los extremos).
              Así se ve completa, sin cortar a ninguna de las tres. */}
          <div className="w-full max-w-md rounded-2xl overflow-hidden mt-2 bg-[#3a1f30]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/creators/landing-hero.webp"
              alt="Kat, Shei y Luz Amparo, mentoras de la Masterclass PODEROSAS"
              className="w-full h-auto object-contain"
            />
          </div>

          <p className="text-sm text-white/70">21 de noviembre de 2026 · 9:00 a. m. – 1:00 p. m.</p>
          <p className="text-sm text-white/70">Calle 85 #12-66, Bogotá</p>

          <div className="mt-2 w-full max-w-sm rounded-2xl bg-white p-6 flex flex-col items-center gap-1 border border-gold-light/50">
            <p className="text-xs uppercase tracking-wide text-gold font-medium">
              Precio de preventa
            </p>
            <p className="font-serif text-4xl text-foreground">{price}</p>
            <p className="text-sm text-foreground/60 text-center">
              Antes $120.000 COP · 50% de descuento para las primeras compradoras
            </p>
          </div>

          <a
            href="#entradas"
            className="mt-2 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors text-center"
          >
            Quiero mi entrada con 50% de descuento
          </a>
          <p className="text-sm text-white/60">
            Una mañana para ti: claridad, conexión, herramientas prácticas y comunidad.
          </p>
        </div>
      </section>

      {/* 2. Este encuentro es para ti si... */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-xl mx-auto flex flex-col gap-5 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            Este encuentro es para ti si...
          </h2>
          <div className="flex flex-col gap-3 text-left">
            {PARA_TI_SI.map((item) => (
              <p key={item} className="flex gap-3 text-foreground/80 text-sm leading-relaxed">
                <span className="text-gold shrink-0">✦</span>
                {item}
              </p>
            ))}
          </div>
          <p className="font-serif text-lg text-foreground mt-2">
            Si te identificaste con varios puntos, no necesitas tenerlo todo resuelto para
            comenzar. Solo necesitas estar dispuesta a dar el primer paso. Este espacio es para
            volver a conectar contigo, reconocer tu potencial y empezar a construir la vida que
            deseas.
          </p>
          <a
            href="#entradas"
            className="self-center mt-2 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Quiero mi entrada con 50% de descuento
          </a>
        </div>
      </section>

      {/* 3. ¿Qué es PODEROSAS? */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto flex flex-col gap-5 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">¿Qué es PODEROSAS?</h2>
          <p className="text-foreground/70 leading-relaxed">
            PODEROSAS es un encuentro presencial creado para mujeres que desean reconectar
            consigo mismas, reconocer sus recursos y talentos, encontrar claridad sobre lo que
            quieren construir y aprender herramientas para llevar sus ideas a la acción.
          </p>
          <p className="text-foreground/70 leading-relaxed">
            Durante cuatro horas vivirás una experiencia guiada por tres mentoras desde miradas
            complementarias: autoconocimiento y emociones, energía y conciencia corporal, y
            ejecución práctica. Será un espacio para reflexionar, aprender, escribir, compartir y
            salir con pasos concretos que puedas empezar a aplicar en tu vida.
          </p>
          <p className="font-serif text-lg text-foreground">
            No necesitas llegar con todo claro ni con un proyecto definido. Puedes llegar con
            preguntas, ideas, ganas de cambiar o la sensación de que necesitas volver a
            escucharte.
          </p>
        </div>
      </section>

      {/* 4. ¿Qué vas a vivir y aprender? */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground text-center mb-10">
            ¿Qué vas a vivir y aprender?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VIVIR_Y_APRENDER.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-beige-light p-6 flex flex-col gap-2 border border-gold-light/40"
              >
                <p className="font-serif text-lg text-foreground font-semibold">{item.title}</p>
                <p className="text-sm text-foreground/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Tres mentoras, tres miradas */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <div className="text-center flex flex-col gap-3">
            <h2 className="font-serif text-3xl sm:text-4xl">Tres mentoras, tres miradas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {mentoras.map((m) => (
              <div key={m.slug} className="flex flex-col items-center text-center gap-3">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-gold-light/40 flex items-center justify-center">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif text-3xl text-gold">{m.initials}</span>
                  )}
                </div>
                <p className="font-serif text-xl text-foreground">{m.name}</p>
                <p className="text-xs uppercase tracking-wide text-gold font-medium">
                  {m.tagline}
                </p>
                <p className="text-sm text-foreground/60 leading-relaxed max-w-xs">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ¿Qué incluye tu entrada? */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-xl mx-auto flex flex-col gap-5 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            ¿Qué incluye tu entrada?
          </h2>
          <div className="flex flex-col gap-3 text-left">
            {INCLUYE.map((item) => (
              <p key={item} className="flex gap-3 text-foreground/80 text-sm leading-relaxed">
                <span className="text-gold shrink-0">—</span>
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Precio y compra */}
      <section id="entradas" className="px-6 py-16 scroll-mt-10">
        <div className="max-w-sm mx-auto flex flex-col items-center text-center gap-4">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
            Tu lugar en esta experiencia te está esperando.
          </h2>

          <div className="w-full rounded-2xl border border-gold-light/60 overflow-hidden grid grid-cols-2">
            <div className="bg-[#542B45] p-4 flex flex-col items-center gap-1">
              <p className="text-[11px] uppercase tracking-wide text-white/70 font-medium">
                Precio regular
              </p>
              <p className="font-serif text-2xl text-white/60 line-through">$120.000</p>
              <p className="text-[11px] text-white/50">Precio habitual</p>
            </div>
            <div className="bg-gold p-4 flex flex-col items-center gap-1">
              <p className="text-[11px] uppercase tracking-wide text-white/90 font-medium">
                Preventa · 50% off
              </p>
              <p className="font-serif text-3xl text-white">{price}</p>
              <p className="text-[11px] text-white/80">Para las primeras compradoras</p>
            </div>
          </div>

          <p className="text-sm text-foreground/60">
            Tu lugar en PODEROSAS puede ser el primer paso para dejar de postergarte. Reserva tu
            entrada anticipada y vive una mañana creada para ti.
          </p>

          <div className="mt-2 w-full">
            <EventTicketForm productId={product.id} />
          </div>
          <p className="text-xs text-foreground/50">
            Pago por pasarela segura. La compra queda confirmada cuando el pago sea verificado.
          </p>
        </div>
      </section>

      {/* 8. Preguntas frecuentes */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <p className="text-center text-sm uppercase tracking-wide text-gold font-medium">
            Preguntas frecuentes
          </p>
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* 9. Cierre emocional */}
      <section className="px-6 py-20">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-5">
          <p className="font-serif text-xl sm:text-2xl text-foreground leading-relaxed">
            No tienes que esperar a que todo esté en orden para empezar a elegirte. A veces, el
            primer cambio comienza cuando haces una pausa, te escuchas, te permites aprender y
            decides dar un paso diferente.
          </p>
          <p className="text-foreground/70">
            Regálate una mañana para reconectar contigo, descubrir nuevas posibilidades y
            llevarte herramientas para empezar a construir la vida que deseas.
          </p>
          <p className="text-sm uppercase tracking-wide text-gold font-medium">
            21 de noviembre de 2026 · 9:00 a. m. a 1:00 p. m. · Bogotá
          </p>
          <p className="font-serif text-lg text-foreground">Masterclass PODEROSAS 2026</p>
          <a
            href="#entradas"
            className="rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Sí, quiero ser parte de PODEROSAS
          </a>
        </div>
      </section>

      {/* Barra fija en móvil: precio + botón siempre visibles al hacer scroll,
          sin tapar contenido (solo padding-bottom del contenedor general). */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gold-light/60 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between gap-3 z-10">
        <div>
          <p className="font-serif text-base text-foreground leading-none">{price}</p>
          <p className="text-[10px] text-foreground/50">21 de noviembre · Bogotá</p>
        </div>
        <a
          href="#entradas"
          className="rounded-full bg-gold px-5 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors whitespace-nowrap"
        >
          Reservar entrada
        </a>
      </div>
    </div>
  );
}
