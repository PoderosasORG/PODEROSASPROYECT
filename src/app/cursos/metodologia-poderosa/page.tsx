import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { CourseViewer } from "@/components/cursos/CourseViewer";

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

    const priceLabel = `$${Math.round(product.price_cents / 100).toLocaleString("es-CO")} COP`;

    // Copy exacto entregado por el usuario para los 3 pilares — se mapea por
    // posición (order_index 0/1/2), no por el título real de la categoría,
    // porque es texto de venta fijo, no un listado dinámico del contenido.
    const pillarCopy = [
      {
        title: "¿Quién soy?",
        desc: "Reconoce tu historia, comprende quién eres y descubre qué aspectos de ti necesitan atención y transformación.",
      },
      {
        title: "¿Qué quiero?",
        desc: "Conecta con tus deseos, identifica lo que realmente importa para ti y dale claridad a eso que quieres para tu vida.",
      },
      {
        title: "¿Cómo lo logro?",
        desc: "Convierte tus deseos en posibilidades concretas y construye un camino propio para empezar a hacerlos realidad.",
      },
    ];

    const transformationBenefits = [
      {
        title: "Mayor comprensión de ti misma.",
        desc: "Reconoce tus emociones, necesidades, fortalezas y aquello que deseas trabajar en tu vida.",
      },
      {
        title: "Herramientas para decidir con mayor claridad.",
        desc: "Identifica tus prioridades, reconoce lo que realmente quieres y aprende a elegir de manera más consciente.",
      },
      {
        title: "Un punto de partida para avanzar.",
        desc: "Convierte tus ideas y deseos en objetivos y define pequeñas acciones que puedas llevar a tu vida cotidiana.",
      },
    ];

    // El curso es el producto; el ebook y las plantillas son el regalo por
    // comprarlo, no el atractivo principal — se separan visualmente abajo.
    const coreItems = [
      "Las 3 categorías del método: ¿Quién soy? · ¿Qué quiero? · ¿Cómo lo logro?",
      "Todos los módulos en video, a tu ritmo y cuantas veces quieras",
      "Material de apoyo descargable en cada módulo",
    ];

    const bonusItems = ["Ebook de relaciones de pareja", "10 plantillas de regalo"];

    const faqs = [
      {
        q: "¿El acceso es de por vida o tiene vencimiento?",
        a: "De por vida. Pagas una sola vez y el curso queda asociado a tu cuenta para siempre — puedes verlo cuando quieras, a tu ritmo.",
      },
      {
        q: "¿Es seguro pagar? ¿Qué métodos aceptan?",
        a: "El pago se procesa con Wompi, una pasarela de pagos certificada en Colombia. Puedes pagar con tarjeta (Visa, Mastercard, Amex) o con PSE, que funciona con cualquier banco colombiano.",
      },
      {
        q: "¿Desde qué dispositivo puedo verlo?",
        a: "Desde cualquiera: computador, tablet o celular. Solo necesitas iniciar sesión en poderosas.org con la cuenta que usaste para comprar.",
      },
      {
        q: "¿Puedo compartir mi acceso con alguien más?",
        a: "No — el acceso queda ligado a tu cuenta personal, igual que el resto de contenido de Poderosas.",
      },
    ];

    return (
      <div className="flex flex-1 flex-col bg-beige-light pb-24">
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-10 gap-5">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Curso virtual · Metodología Poderosa
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight max-w-2xl">
            {product.title}
          </h1>
          <p className="max-w-xl text-foreground/70 text-lg">
            Un espacio para hacer una pausa, escucharte, reconectar contigo y empezar a construir
            una vida más alineada con lo que realmente eres y deseas.
          </p>
        </section>

        {previewCategories && previewCategories.length > 0 && (
          <section className="px-6 pb-14">
            <div className="max-w-4xl mx-auto">
              <p className="text-center text-sm uppercase tracking-wide text-gold font-medium mb-6">
                Los 3 pilares de tu transformación
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {previewCategories.slice(0, 3).map((category, index) => (
                  <div
                    key={category.id}
                    className="rounded-2xl bg-white p-6 flex flex-col gap-2 border border-gold-light/50"
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
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-6 pb-14">
          <div className="max-w-2xl mx-auto">
            <p className="text-center text-sm uppercase tracking-wide text-gold font-medium mb-8">
              Lo que te llevas
            </p>
            <div className="flex flex-col gap-7">
              {transformationBenefits.map((benefit, index) => (
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

        {/* Tarjeta de compra: presentación editorial de producto premium,
            no una lista de características. El curso (coreItems) se separa
            visualmente del regalo (bonusItems) para que el ebook/plantillas
            nunca compitan con la metodología como "el producto". */}
        <section className="px-6 pb-10">
          <div className="max-w-xl mx-auto rounded-3xl bg-white border border-gold-light/50 p-8 sm:p-10">
            <p className="text-xs uppercase tracking-wide text-gold font-medium text-center">
              Metodología Poderosa
            </p>
            <p className="text-sm text-foreground/60 text-center mt-1 mb-8">
              Tu proceso de autoconocimiento, claridad y acción, en un solo lugar.
            </p>

            <p className="font-serif text-lg text-foreground mb-3">Incluye</p>
            <ul className="flex flex-col gap-2.5 mb-8">
              {coreItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-gold mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-beige-light/70 rounded-2xl p-5 mb-8">
              <p className="text-xs uppercase tracking-wide text-gold font-medium mb-2.5">
                De regalo, por tu compra
              </p>
              <ul className="flex flex-col gap-1.5">
                {bonusItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/70">
                    <span className="text-gold mt-0.5">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center border-t border-gold-light/30 pt-8">
              <p className="font-serif text-5xl text-foreground">{priceLabel}</p>
              <p className="text-sm text-foreground/60 mt-2">Pago único · Acceso de por vida</p>
            </div>

            <div className="flex flex-col items-center gap-2 mt-6">
              <BuyButton
                productId={product.id}
                slug="cursos/metodologia-poderosa"
                accentColor="#c9a24b"
                size="large"
                label="Quiero empezar"
              />
              <p className="text-xs text-foreground/50 flex items-center gap-1">
                🔒 Pago seguro procesado por Wompi · Tarjetas y PSE (todos los bancos)
              </p>
              {!user && (
                <p className="text-xs text-foreground/50">
                  Te pediremos iniciar sesión o crear una cuenta para completar la compra.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="px-6">
          <div className="max-w-xl mx-auto flex flex-col gap-4">
            <p className="text-center text-sm uppercase tracking-wide text-gold font-medium">
              Preguntas frecuentes
            </p>
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl border border-gold-light/40 p-4">
                <p className="text-sm font-medium text-foreground">{faq.q}</p>
                <p className="text-sm text-foreground/60 mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Barra de compra fija: precio + botón siempre visibles al hacer scroll */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gold-light/60 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-6 py-3 flex items-center justify-between gap-4 z-10">
          <div>
            <p className="font-serif text-lg text-foreground leading-none">{priceLabel}</p>
            <p className="text-[11px] text-foreground/50">Acceso inmediato</p>
          </div>
          <BuyButton
            productId={product.id}
            slug="cursos/metodologia-poderosa"
            accentColor="#c9a24b"
            size="large"
            label="Quiero empezar"
          />
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
