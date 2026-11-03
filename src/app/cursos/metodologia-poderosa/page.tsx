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
      .select("title, order_index")
      .eq("product_id", product.id)
      .order("order_index");

    const priceLabel = `$${Math.round(product.price_cents / 100).toLocaleString("es-CO")} COP`;

    return (
      <div className="flex flex-1 flex-col bg-beige-light">
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-10 gap-5">
          <span className="uppercase tracking-[0.3em] text-xs text-gold font-medium">
            Curso virtual · Metodología Poderosa
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight max-w-2xl">
            {product.title}
          </h1>
          <p className="max-w-xl text-foreground/70 text-lg">
            {product.description ||
              "Un método práctico para entender lo que sientes, descubrir lo que realmente quieres y empezar a convertirlo en realidad."}
          </p>
        </section>

        {previewCategories && previewCategories.length > 0 && (
          <section className="px-6 pb-10">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-sm uppercase tracking-wide text-gold font-medium mb-6">
                Qué incluye
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {previewCategories.map((category, index) => (
                  <div
                    key={category.title}
                    className="rounded-2xl bg-white p-5 flex flex-col gap-2 border border-gold-light/40"
                  >
                    <span className="font-serif text-2xl text-gold-light">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="font-serif text-lg">{category.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-6 pb-10">
          <div className="max-w-xl mx-auto flex flex-col gap-3">
            {[
              "Entenderte mejor: reconocer qué sientes, qué necesitas y qué quieres cambiar.",
              "Tomar decisiones con más claridad: identificar tus prioridades y evaluar qué tiene sentido para ti.",
              "Un plan propio: acciones realistas que puedas empezar a aplicar en tu vida cotidiana.",
            ].map((item) => (
              <p key={item} className="flex gap-3 text-foreground/80">
                <span className="text-gold">✦</span>
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="max-w-sm mx-auto rounded-2xl bg-white p-8 flex flex-col items-center gap-2 text-center border border-gold-light/60 sticky bottom-4 sm:static shadow-lg sm:shadow-none">
            <p className="text-xs uppercase tracking-wide text-gold font-medium">
              Acceso de por vida
            </p>
            <p className="font-serif text-5xl text-foreground">{priceLabel}</p>
            <p className="text-sm text-foreground/60 mb-2">Las 3 categorías, pago único</p>
            <BuyButton
              productId={product.id}
              slug="cursos/metodologia-poderosa"
              accentColor="#c9a24b"
              size="large"
              label="Comprar el curso"
            />
            {!user && (
              <p className="text-xs text-foreground/50 mt-2">
                Te pediremos iniciar sesión o crear una cuenta para completar la compra.
              </p>
            )}
          </div>
        </section>
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

  return <CourseViewer categories={categories} modules={modules ?? []} />;
}
