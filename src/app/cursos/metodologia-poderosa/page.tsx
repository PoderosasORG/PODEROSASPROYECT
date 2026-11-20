import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { CourseViewer } from "@/components/cursos/CourseViewer";
import { ProfileCard } from "@/components/ProfileCard";
import { FaqAccordion } from "@/components/cursos/FaqAccordion";
import { stripHtml } from "@/lib/panel/sanitize";
import { WaitlistForm } from "@/components/WaitlistForm";
import { LaunchCountdown } from "@/components/cursos/LaunchCountdown";
import {
  LAUNCH_DEADLINE,
  METODOLOGIA_PODEROSAS_PRODUCT_ID,
  effectivePriceCents,
  isLaunchPriceActive,
} from "@/lib/metodologiaPoderosasLanzamiento";

// Lanzamiento próximo: el curso aún no está a la venta. En true, la página
// muestra el contenido y la lista de espera, pero oculta precio y botón de
// compra. Cuando el curso esté listo, cambiar a false para activar la venta.
const COURSE_COMING_SOON = false;

// Mismo patrón que src/app/page.tsx (home) para las 3 creadoras — se
// duplica aquí porque esta página necesita las mismas tarjetas, con sus
// fotos y bios reales, dentro del flujo de venta (sección "Nuestras
// PODEROSAS"), no solo enlazadas desde otra parte del sitio.
const CREATOR_ORDER = ["luz", "kat", "shei"];
const CREATOR_DEFAULTS: Record<string, { name: string; role: string; bio: string }> = {
  kat: {
    name: "Kat",
    role: "PODEROSAS",
    bio: "Creadora de la metodología PODEROSAS: claridad, decisión y acción para mujeres que quieren cambiar de vida.",
  },
  shei: {
    name: "Shei",
    role: "PODEROSAS",
    bio: "Psicóloga | Estratega digital y creadora de contenido",
  },
  luz: {
    name: "Luz",
    role: "PODEROSAS",
    bio: "Experiencia y sabiduría al servicio de la comunidad, con herramientas propias.",
  },
};

export default async function MetodologiaPoderosaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El producto se ancla a través de course_categories (solo se siembran a mano
  // desde el SQL Editor; ninguna creadora puede insertarlas), no por título:
  // cualquiera podría publicar un producto llamado "Metodología Poderosa" y
  // desviar el pago del BuyButton hacia ella.
  const { data: anyCategory } = await supabase
    .from("course_categories")
    .select("product_id")
    .order("order_index")
    .limit(1)
    .maybeSingle();

  const { data: product } = anyCategory
    ? await supabase
        .from("products")
        .select("id, title, description, price_cents, cover_image_url")
        .eq("id", anyCategory.product_id)
        .maybeSingle()
    : { data: null };

  if (!product) {
    return (
      <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
        <p className="text-foreground/60">Este curso todavía no está disponible.</p>
      </div>
    );
  }

  const { data: hasAccess } = await supabase.rpc("has_access_to_product", { p_product_id: product.id });

  if (!user || !hasAccess) {
    const { data: previewCategories } = await supabase
      .from("course_categories")
      .select("id, title, order_index")
      .eq("product_id", product.id)
      .order("order_index");

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

    const isMetodologiaPoderosas = product.id === METODOLOGIA_PODEROSAS_PRODUCT_ID;
    const launchActive = isMetodologiaPoderosas && isLaunchPriceActive();
    const priceCents = effectivePriceCents(product.id, product.price_cents);
    const priceLabel = `$${Math.round(priceCents / 100).toLocaleString("es-CO")} COP`;
    const regularPriceLabel = `$${Math.round(product.price_cents / 100).toLocaleString("es-CO")} COP`;

    const problemas = [
      "Sientes que necesitas un cambio, pero no logras identificar qué es lo que realmente quieres.",
      "Tienes muchas ideas y proyectos, pero te cuesta convertirlos en decisiones y acciones.",
      "A veces eliges pensando en las expectativas de los demás y dejas tus propios deseos en segundo plano.",
      "Consumes información, buscas respuestas y guardas consejos, pero sigues sintiendo que necesitas ordenar lo que pasa dentro de ti.",
      "Sabes que tienes sueños y cosas pendientes, pero no encuentras cómo empezar.",
    ];

    // Copy exacto entregado por el usuario para los 3 pilares — se mapea por
    // posición (order_index 0/1/2), no por el título real de la categoría,
    // porque es texto de venta fijo, no un listado dinámico del contenido.
    const pillarCopy = [
      {
        title: "Reconoce quién eres",
        desc: "Comprende lo que sientes, identifica tus necesidades y reconoce las experiencias y patrones que influyen en tu manera de vivir y decidir.",
        takeaway: "Herramientas de autoconocimiento para comprenderte y escucharte con mayor intención.",
      },
      {
        title: "Descubre qué quieres",
        desc: "Distingue tus deseos de las expectativas externas, explora tus posibilidades y reconoce qué es importante para ti en esta etapa de tu vida.",
        takeaway: "Mayor claridad sobre tus prioridades, valores y dirección personal.",
      },
      {
        title: "Convierte tus deseos en acciones",
        desc: "Pasa de las ideas a los pasos concretos. Aprende a organizar tus objetivos, tomar decisiones y construir una forma de avanzar.",
        takeaway: "Ejercicios y herramientas prácticas para comenzar a materializar lo que quieres.",
      },
    ];

    const benefits = [
      {
        title: "Una relación más consciente contigo.",
        desc: "Reconocer tus emociones, necesidades, fortalezas y aquello que quieres trabajar.",
      },
      {
        title: "Decisiones más alineadas con tus prioridades.",
        desc: "Aprender a identificar qué es importante para ti y qué lugar quieres darle en tu vida.",
      },
      {
        title: "Una mirada más clara sobre tus deseos.",
        desc: "Diferenciar lo que realmente quieres de lo que has aprendido a esperar de ti misma.",
      },
      {
        title: "Mayor conciencia sobre lo que te frena.",
        desc: "Explorar patrones, creencias y expectativas que pueden estar dificultando tu avance.",
      },
      {
        title: "Un plan que parta de ti.",
        desc: "Organizar tus ideas y definir acciones realistas para comenzar a avanzar.",
      },
    ];

    const herramientas = [
      "Ejercicios de autoconocimiento.",
      "Actividades para identificar tus deseos y prioridades.",
      "Herramientas de reflexión personal.",
      "Ejercicios para organizar tus objetivos y definir próximos pasos.",
    ];

    // El curso es el producto; el ebook y las plantillas son el regalo por
    // comprarlo, no el atractivo principal — se separan visualmente abajo.
    const coreItems = [
      {
        title: "Los 3 módulos de la Metodología Poderosa",
        desc: "Explora las tres etapas del proceso: quién soy, qué quiero y cómo lo logro.",
      },
      {
        title: "Clases en video a tu propio ritmo",
        desc: "Avanza cuando quieras y vuelve a cada contenido siempre que lo necesites.",
      },
      {
        title: "Material de trabajo descargable",
        desc: "Cartillas y ejercicios prácticos para acompañar cada módulo y llevar tus reflexiones a la práctica.",
      },
    ];

    const bonusItems = [
      {
        title: "BONO 1 · Masterclass: crea tu marca personal y construye una comunidad PODEROSA",
        desc: "Aprende a construir tu marca personal, comunicar lo que te hace diferente y desarrollar una comunidad alrededor de tu propuesta de valor.",
      },
      {
        title: "BONO 2 · Siete fuentes de ingresos para monetizar en redes sociales",
        desc: "Conoce distintas alternativas de monetización y maneras de convertir una comunidad en oportunidades comerciales.",
      },
      {
        title: "BONO 3 · Ebook: 50 acuerdos de pareja para tener una relación sana y duradera",
        desc: "Un recurso práctico para reflexionar sobre acuerdos, comunicación, respeto y construcción de relaciones saludables.",
      },
      {
        title: "BONO 4 · Reto de 7 días para enfocarte en ti y fortalecer tu amor propio",
        desc: "Una experiencia de 7 días con actividades para dedicarte tiempo, reconectar contigo misma y fortalecer tu autoestima.",
      },
      {
        title: "BONO 5 · Masterclass: cómo atraer a tu pareja ideal y construir la relación de tus sueños",
        desc: "Reconoce tus estándares, fortalece tu autoestima y desarrolla herramientas para crear vínculos conscientes y saludables.",
      },
    ];

    const faqs = [
      {
        q: "¿Necesito tener conocimientos previos para realizar el curso?",
        a: "No. El curso está diseñado para empezar desde donde estés, sin necesidad de experiencia previa en autoconocimiento ni en ningún tema en particular.",
      },
      {
        q: "¿Cómo puedo acceder al curso después de comprarlo?",
        a: "Desde tu cuenta en poderosas.org → Mi panel → Mis compras, o directamente desde esta misma página una vez hayas iniciado sesión.",
      },
      {
        q: "¿Puedo avanzar a mi propio ritmo?",
        a: "Sí. No hay fechas límite ni un orden obligatorio — puedes pausar, retomar y volver a cualquier módulo cuando quieras.",
      },
      {
        q: "¿Cuánto tiempo tengo acceso al contenido?",
        a: "Tu acceso dura 6 meses desde el día en que se aprueba tu pago. Cuando esté por vencerse, te avisamos para que renueves y sigas teniendo acceso a la metodología, los encuentros y la comunidad.",
      },
      {
        q: "¿Por qué el precio cambia después del sábado?",
        a: "$397.000 es el precio especial de lanzamiento, válido solo hasta el sábado 21 de noviembre a las 11:59 p.m. Después de esa fecha, el precio regular es de $497.000.",
      },
      {
        q: "¿Qué materiales recibiré?",
        a: "Los módulos en video, cartillas descargables, acceso a las 6 clases en vivo (y sus grabaciones), la comunidad de WhatsApp, tu certificado al completar el curso, la meditación guiada, y los 5 bonos de regalo si compras antes del cierre de la promoción.",
      },
      {
        q: "¿Puedo realizar las actividades desde mi celular o computador?",
        a: "Sí, desde cualquier dispositivo — computador, tablet o celular. Solo necesitas iniciar sesión con la cuenta que usaste para comprar.",
      },
      {
        q: "¿El curso reemplaza un proceso de psicoterapia?",
        a: "No. Metodología Poderosa es una experiencia educativa y de autoconocimiento — no sustituye la atención psicológica profesional.",
      },
    ];

    return (
      <div className="flex flex-1 flex-col bg-beige-light pb-24">
        {/* 1. Encabezado principal — layout tipo ficha de producto (imagen +
            título/precio/CTA a la derecha), como pidió la usuaria a partir
            de una referencia. El resto de la narrativa de venta sigue
            debajo, en las secciones 2 en adelante. */}
        <section className="px-6 pt-16 pb-10">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:items-start">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] md:aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/creators/landing-hero.webp"
                alt="Kat, Shei y Luz Amparo, mentoras de Metodología Poderosa"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-4">
              <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
                Metodología PODEROSAS 2026–2027
                {COURSE_COMING_SOON && " · Próximamente"}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl leading-tight">
                Deja de dar vueltas. Empieza a construir una vida que se sienta tuya.
              </h1>

              {COURSE_COMING_SOON ? (
                <p className="font-serif text-2xl text-foreground">Próximamente</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {launchActive && (
                    <span className="text-sm text-foreground/40 line-through">{regularPriceLabel}</span>
                  )}
                  <p className="font-serif text-3xl text-foreground">{priceLabel}</p>
                  {launchActive ? (
                    <>
                      <p className="text-xs text-gold font-medium">
                        Precio de lanzamiento — válido hasta el sábado 21 de nov., 11:59 p.m.
                      </p>
                      <LaunchCountdown deadlineIso={LAUNCH_DEADLINE.toISOString()} />
                    </>
                  ) : isMetodologiaPoderosas ? (
                    <p className="text-xs text-foreground/50">Precio regular</p>
                  ) : null}
                </div>
              )}

              {COURSE_COMING_SOON ? (
                <WaitlistForm source="metodologia-poderosa" />
              ) : (
                <BuyButton
                  productId={product.id}
                  slug="cursos/metodologia-poderosa"
                  accentColor="#bd7d47"
                  size="large"
                  label="Compra ahora"
                />
              )}

              <div className="border-t border-gold-light/30 pt-4 flex flex-col gap-2.5">
                <p className="text-xs uppercase tracking-wide text-gold font-medium">
                  Lo que recibes
                </p>
                {coreItems.map((item) => (
                  <p key={item.title} className="text-sm text-foreground/80">
                    <span className="font-medium text-foreground">{item.title}.</span>{" "}
                    {item.desc}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Identificación con el problema */}
        <section className="px-6 pb-14 bg-white">
          <div className="max-w-xl mx-auto pt-14 flex flex-col gap-5 text-center">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              ¿Sientes que quieres algo diferente, pero no sabes por dónde empezar?
            </h2>
            <p className="text-sm text-foreground/60">Quizás te identifiques con alguna de estas situaciones:</p>
            <div className="flex flex-col gap-3 text-left">
              {problemas.map((item) => (
                <p key={item} className="flex gap-3 text-foreground/80 text-sm leading-relaxed">
                  <span className="text-gold shrink-0">✦</span>
                  {item}
                </p>
              ))}
            </div>
            <p className="font-serif text-lg text-foreground mt-2">
              No necesitas resolver toda tu vida hoy. Necesitas un espacio para escucharte,
              reconocer lo que quieres y comenzar desde ahí.
            </p>
          </div>
        </section>

        {/* 3. Los 3 pilares de la metodología */}
        {previewCategories && previewCategories.length > 0 && (
          <section className="px-6 py-14">
            <div className="max-w-4xl mx-auto">
              <p className="text-center text-sm uppercase tracking-wide text-gold font-medium mb-8">
                Tres pasos para empezar a construir tu propio camino
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {previewCategories.slice(0, 3).map((category, index) => (
                  <div
                    key={category.id}
                    className="rounded-2xl bg-white/80 p-6 flex flex-col gap-2 border border-gold-light/60 shadow-sm"
                  >
                    <span className="font-serif text-3xl text-gold-light">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="font-serif text-xl text-foreground font-semibold">
                      {pillarCopy[index]?.title ?? category.title}
                    </p>
                    <p className="text-sm text-foreground/60 leading-relaxed">
                      {pillarCopy[index]?.desc}
                    </p>
                    <p className="text-xs text-foreground/50 mt-2">
                      <span className="text-gold font-medium">Te llevas: </span>
                      {pillarCopy[index]?.takeaway}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4. Beneficios y resultados */}
        <section className="px-6 py-14 bg-white">
          <div className="max-w-2xl mx-auto">
            <p className="text-center text-sm uppercase tracking-wide text-gold font-medium mb-8">
              Lo que puedes empezar a construir a partir de este proceso
            </p>
            <div className="flex flex-col gap-7">
              {benefits.map((benefit, index) => (
                <div key={benefit.title} className="flex gap-4">
                  <span className="shrink-0 font-serif text-xl text-gold-light">
                    {String(index + 1).padStart(2, "0")}.
                  </span>
                  <div>
                    <p className="text-foreground font-semibold">{benefit.title}</p>
                    <p className="text-sm text-foreground/60 mt-1 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Herramientas y materiales prácticos — fotos reales de una de
            las cartillas descargables (portada + 2 páginas de ejercicio),
            no representaciones inventadas del material. */}
        <section className="px-6 py-14">
          <div className="max-w-xl mx-auto text-center flex flex-col gap-4 rounded-2xl bg-white/80 border border-gold-light/60 shadow-sm p-8">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              No es solo un curso. Es un espacio para trabajar en ti.
            </h2>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Cada módulo está acompañado de una cartilla descargable con ejercicios y
              actividades diseñados para llevar las reflexiones a la práctica. No se trata
              únicamente de escuchar información: tendrás espacios para escribir, explorar tus
              ideas, responder preguntas y trabajar en tu propio proceso.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mt-10 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { src: "/images/cartilla-metodologia/cartilla-portada.jpg", alt: "Portada de la cartilla descargable del módulo ¿Qué quiero?" },
              { src: "/images/cartilla-metodologia/cartilla-ejercicio-1.jpg", alt: "Página de ejercicio de la cartilla: visualiza tus resultados" },
              { src: "/images/cartilla-metodologia/cartilla-ejercicio-2.jpg", alt: "Página de ejercicio de la cartilla: mi brújula interior" },
            ].map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                className="w-full aspect-[3/4] object-cover rounded-2xl border border-gold-light/50 shadow-sm"
              />
            ))}
          </div>

          <div className="max-w-xl mx-auto text-center flex flex-col gap-4 mt-10">
            <p className="font-serif text-lg text-foreground">Herramientas que podrás utilizar:</p>
            <div className="flex flex-col gap-2 text-left max-w-sm mx-auto">
              {herramientas.map((item) => (
                <p key={item} className="flex gap-3 text-foreground/80 text-sm">
                  <span className="text-gold shrink-0">—</span>
                  {item}
                </p>
              ))}
            </div>
            <p className="text-sm text-foreground/60 mt-2">
              Un recorrido que puedes realizar a tu ritmo, volver a consultar y trabajar desde tu
              propia experiencia.
            </p>
          </div>
        </section>

        {/* 5.5. Qué incluye tu acceso — alineado con la definición oficial
            de la oferta (doc. "Proyecto PODEROSAS 2026"). Las 6 clases en
            vivo agrupan los 8 temas del brief en 6 encuentros — PENDIENTE
            de que Shei confirme esta agrupación específica. */}
        <section className="px-6 py-14 bg-white">
          <div className="max-w-xl mx-auto text-center flex flex-col gap-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              Seis meses de acompañamiento, no solo un curso
            </h2>
            <ul className="flex flex-col gap-3 text-left mx-auto max-w-md">
              {[
                "Acceso por 6 meses a la Metodología PODEROSAS (y a lo que se vaya actualizando durante ese tiempo).",
                "6 clases en vivo: autoestima y seguridad personal, marca personal, relaciones de pareja, productividad y organización del tiempo, hábitos y energía, y liderazgo.",
                "Acceso a las grabaciones de las 6 clases, disponibles en la plataforma durante tus 6 meses de acceso.",
                "Comunidad privada de WhatsApp — Amigas PODEROSAS.",
                "Acompañamiento y soporte durante todo tu proceso.",
                "Certificado de finalización al completar todos los módulos.",
                "Meditación guiada para activar tu versión más poderosa.",
                "Acceso preferencial y preventa a futuros eventos PODEROSAS.",
                "Cartillas y ejercicios descargables de cada módulo.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-gold shrink-0">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Nuestras PODEROSAS */}
        <section className="px-6 py-14 bg-white">
          <div className="max-w-4xl mx-auto flex flex-col gap-10">
            <div className="text-center flex flex-col gap-3">
              <h2 className="font-serif text-3xl sm:text-4xl">Nuestras PODEROSAS</h2>
              <p className="text-foreground/70 max-w-xl mx-auto">
                Tres mujeres, tres trayectorias y una visión compartida: crear herramientas que te
                acompañen a conocerte, reconocer lo que quieres y encontrar tu propia manera de
                avanzar.
              </p>
              <p className="text-foreground/70 max-w-xl mx-auto">
                Desde la psicología, el análisis energético y la comunicación, unimos nuestras
                experiencias y conocimientos para dar vida a una metodología que integra
                distintas perspectivas sobre el ser humano.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {profiles.map((profile) => (
                <ProfileCard key={profile.slug} {...profile} />
              ))}
            </div>
          </div>
        </section>

        {/* 7. Tarjeta de compra: presentación editorial de producto premium,
            no una lista de características. El curso (coreItems) se separa
            visualmente del regalo (bonusItems) para que el ebook/plantillas
            nunca compitan con la metodología como "el producto". */}
        <section id="tarjeta-compra" className="px-6 py-14 scroll-mt-10">
          <div className="max-w-xl mx-auto rounded-3xl bg-white border border-gold-light/50 p-8 sm:p-10">
            <p className="text-xs uppercase tracking-wide text-gold font-medium text-center">
              Tu experiencia PODEROSAS incluye
            </p>
            <p className="font-serif text-2xl text-foreground text-center mt-2">Metodología Poderosa</p>
            <p className="text-sm text-foreground/60 text-center mt-1 mb-8">
              Un recorrido de tres módulos para explorar quién eres, descubrir qué quieres y
              encontrar cómo empezar a hacerlo realidad.
            </p>

            <p className="text-xs uppercase tracking-wide text-gold font-medium mb-3">Tu curso completo</p>
            <ul className="flex flex-col gap-3 mb-8">
              {coreItems.map((item) => (
                <li key={item.title} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="text-gold mt-0.5">—</span>
                  <div>
                    <span className="text-foreground font-medium">{item.title}</span>
                    <p className="text-foreground/60">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="bg-beige-light/70 rounded-2xl p-5 mb-8">
              <p className="text-xs uppercase tracking-wide text-gold font-medium mb-2.5">
                Además, recibes estos regalos
              </p>
              <ul className="flex flex-col gap-3">
                {bonusItems.map((item) => (
                  <li key={item.title} className="flex items-start gap-2.5 text-sm">
                    <span className="text-gold mt-0.5">—</span>
                    <div>
                      <span className="text-foreground font-medium">{item.title}</span>
                      <p className="text-foreground/60">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {COURSE_COMING_SOON ? (
              <div className="text-center border-t border-gold-light/30 pt-8 flex flex-col items-center gap-4">
                <p className="text-xs uppercase tracking-wide text-gold font-medium">
                  Próximamente
                </p>
                <p className="text-sm text-foreground/60 max-w-sm">
                  Estamos dejando todo listo para abrir las inscripciones. Déjanos tu correo y te
                  avisamos apenas esté disponible.
                </p>
                <WaitlistForm source="metodologia-poderosa" />
              </div>
            ) : (
              <>
                <div className="text-center border-t border-gold-light/30 pt-8">
                  <p className="text-xs uppercase tracking-wide text-gold font-medium">Tu inversión</p>
                  {launchActive && (
                    <p className="text-sm text-foreground/40 line-through mt-1">{regularPriceLabel}</p>
                  )}
                  <p className="font-serif text-5xl text-foreground mt-1">{priceLabel}</p>
                  {launchActive ? (
                    <>
                      <p className="text-sm text-gold font-medium mt-2">
                        Precio válido hasta el sábado 21 de nov., 11:59 p.m.
                      </p>
                      <div className="mt-1">
                        <LaunchCountdown deadlineIso={LAUNCH_DEADLINE.toISOString()} />
                      </div>
                    </>
                  ) : null}
                  <p className="text-sm text-foreground/60 mt-2">
                    Acceso por 6 meses. Un solo pago — no es una suscripción que se cobre sola; al
                    vencerse, te avisamos para renovar.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2 mt-6">
                  <BuyButton
                    productId={product.id}
                    slug="cursos/metodologia-poderosa"
                    accentColor="#bd7d47"
                    size="large"
                    label="Quiero comenzar mi proceso"
                  />
                  <p className="text-xs text-foreground/50 flex items-center gap-1">
                    🔒 Pago seguro a través de Wompi. Aceptamos tarjetas y PSE.
                  </p>
                  <p className="text-xs text-foreground/50">
                    Al comprar, podrás iniciar sesión o crear tu cuenta para acceder al curso.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 8. Preguntas frecuentes */}
        <section className="px-6">
          <div className="max-w-xl mx-auto flex flex-col gap-4">
            <p className="text-center text-sm uppercase tracking-wide text-gold font-medium">
              Preguntas frecuentes
            </p>
            <FaqAccordion items={faqs} />
          </div>
        </section>

        {/* Barra fija al hacer scroll: compra si ya está a la venta, o
            próximamente + ancla a la lista de espera mientras no lo esté */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gold-light/60 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-6 py-3 flex items-center justify-between gap-4 z-10">
          {COURSE_COMING_SOON ? (
            <>
              <div>
                <p className="font-serif text-lg text-foreground leading-none">
                  Próximamente lanzamiento oficial
                </p>
                <p className="text-[11px] text-foreground/50">de Metodología Poderosa</p>
              </div>
              <a
                href="#tarjeta-compra"
                className="rounded-full bg-gold px-6 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors whitespace-nowrap"
              >
                Avísenme
              </a>
            </>
          ) : (
            <>
              <div>
                <p className="font-serif text-lg text-foreground leading-none">{priceLabel}</p>
                <p className="text-[11px] text-foreground/50">
                  {launchActive ? "Precio de lanzamiento · hasta el sábado 11:59 p.m." : "Acceso por 6 meses"}
                </p>
              </div>
              <BuyButton
                productId={product.id}
                slug="cursos/metodologia-poderosa"
                accentColor="#bd7d47"
                size="large"
                label="Quiero comenzar mi proceso"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("course_categories")
    .select("id, title, order_index")
    .eq("product_id", product.id)
    .order("order_index");

  const { data: modules } = await supabase
    .from("category_modules")
    .select("id, category_id, title, description, custom_thumbnail_url, order_index, is_published")
    .in("category_id", (categories ?? []).map((c) => c.id))
    .eq("is_published", true)
    .order("order_index")
    .order("created_at");

  if (!categories || categories.length === 0) {
    redirect("/panel");
  }

  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: progressRows } =
    moduleIds.length > 0
      ? await supabase.from("module_progress").select("module_id").in("module_id", moduleIds)
      : { data: [] as { module_id: string }[] };

  return (
    <CourseViewer
      categories={categories}
      modules={modules ?? []}
      productId={product.id}
      completedModuleIds={(progressRows ?? []).map((r) => r.module_id)}
    />
  );
}
