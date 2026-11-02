import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/BuyButton";
import { CourseViewer } from "@/components/cursos/CourseViewer";

export default async function MetodologiaPoderosaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price_cents, cover_image_url")
    .eq("title", "Metodología Poderosa")
    .maybeSingle();

  if (!product) {
    return (
      <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
        <p className="text-foreground/60">Este curso todavía no está disponible.</p>
      </div>
    );
  }

  const { data: hasAccess } = await supabase.rpc("has_access_to_product", { p_product_id: product.id });

  if (!user || !hasAccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-beige-light px-6 py-24 gap-6 text-center">
        <h1 className="font-serif text-3xl">{product.title}</h1>
        <p className="text-foreground/70 max-w-md">{product.description}</p>
        {!user ? (
          <a href={`/login?next=/cursos/metodologia-poderosa`} className="text-gold hover:underline">
            Inicia sesión para comprarlo
          </a>
        ) : (
          <BuyButton productId={product.id} slug="cursos/metodologia-poderosa" accentColor="#c9a24b" />
        )}
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
    .order("order_index");

  if (!categories || categories.length === 0) {
    redirect("/panel");
  }

  return <CourseViewer categories={categories} modules={modules ?? []} />;
}
