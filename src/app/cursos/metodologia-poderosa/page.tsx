import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { CourseViewer } from "@/components/cursos/CourseViewer";
import { ProfileCard } from "@/components/ProfileCard";
import { FaqAccordion } from "@/components/cursos/FaqAccordion";
import { stripHtml } from "@/lib/panel/sanitize";
import { WaitlistForm } from "@/components/WaitlistForm";

// Lanzamiento próximo: el curso aún no está a la venta. En true, la página
// muestra el contenido y la lista de espera, pero oculta precio y botón de
// compra. Cuando el curso esté listo, cambiar a false para activar la venta.
const COURSE_COMING_SOON = true;

// Mismo patrón que src/app/page.tsx (home) para las 3 creadoras — se
// duplica aquí porque esta página necesita las mismas tarjetas, con sus
// fotos y bios reales, dentro del flujo de venta (sección "Nuestras
// Poderosas"), no solo enlazadas desde otra parte del sitio.
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

    const priceLabel = `$${Math.round(product.price_cents / 100).toLocaleString("es-CO")} COP`;

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
      { title: "BONUS 1 · Ebook de relaciones de pareja", desc: "Un recurso adicional para profundizar en el mundo de las relaciones." },
      {
        title: "BONUS 2 · 10 plantillas prácticas de bienestar emocional",
        desc: "Herramientas descargables para acompañar tus procesos de reflexión y autoconocimiento.",
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
        a: "El acceso es de por vida. Pagas una sola vez y el curso queda asociado a tu cuenta para siempre.",
      },
      {
        q: "¿Qué materiales recibiré?",
        a: "Los 3 módulos en video, una cartilla descargable con ejercicios por cada uno, y los dos bonus de regalo (el ebook y las plantillas).",
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
        {/* 1. Encabezado principal */}
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-10 gap-5">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Curso virtual · Metodología Poderosa
            {COURSE_COMING_SOON && " · Próximamente"}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight max-w-2xl">
            Deja de dar vueltas. Empieza a construir una vida que se sienta tuya.
          </h1>
          <p className="max-w-xl text-foreground/70 text-lg">
            Un método práctico para comprenderte mejor, descubrir lo que realmente quieres y
            empezar a avanzar hacia ello.
          </p>
          <p className="max-w-xl text-foreground/60 text-sm leading-relaxed">
            A veces sabes que necesitas un cambio, pero no sabes qué cambiar, por dónde empezar o
            cómo dejar de postergar lo que es importante para ti. Metodología Poderosa te
            acompaña a ordenar tus ideas, reconocer tus necesidades y convertir tus deseos en
            decisiones y acciones concretas.
          </p>
          <p className="font-serif text-xl text-foreground max-w-md">
            No necesitas tener todas las respuestas. Necesitas empezar a hacerte las preguntas
            correctas.
          </p>
          <a
            href="#tarjeta-compra"
            className="rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors"
          >
            {COURSE_COMING_SOON ? "Avísenme cuando esté listo" : "Quiero ser parte de Poderosas"}
          </a>
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

        {/* 6. Nuestras Poderosas */}
        <section className="px-6 py-14 bg-white">
          <div className="max-w-4xl mx-auto flex flex-col gap-10">
            <div className="text-center flex flex-col gap-3">
              <h2 className="font-serif text-3xl sm:text-4xl">Nuestras Poderosas</h2>
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
              Tu experiencia Poderosa incluye
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
                  <p className="font-serif text-5xl text-foreground mt-1">{priceLabel}</p>
                  <p className="text-sm text-foreground/60 mt-2">
                    Un único pago. Acceso de por vida. Sin mensualidades ni suscripciones.
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
                <p className="font-serif text-lg text-foreground leading-none">Próximamente</p>
                <p className="text-[11px] text-foreground/50">Te avisamos cuando abra</p>
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
                <p className="text-[11px] text-foreground/50">Acceso inmediato</p>
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

  return <CourseViewer categories={categories} modules={modules ?? []} productId={product.id} />;
}
