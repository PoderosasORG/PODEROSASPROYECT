import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryTitleEditor } from "@/components/panel/metodologia/CategoryTitleEditor";
import { ModuleList } from "@/components/panel/metodologia/ModuleList";
import { BonusFileManager } from "@/components/panel/metodologia/BonusFileManager";

export default async function MetodologiaPoderosaPanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/panel/metodologia-poderosa");

  const { data: category } = await supabase
    .from("course_categories")
    .select("id, title, product_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!category) redirect("/panel");

  const { data: modules } = await supabase
    .from("category_modules")
    .select("id, category_id, title, description, bunny_video_id, custom_thumbnail_url, order_index, is_published")
    .eq("category_id", category.id)
    .order("order_index")
    .order("created_at");

  // Los bonos descargables (ebook, plantillas) son del producto completo,
  // no de una categoría — solo la dueña técnica del producto los administra
  // (hoy Shei, porque el cobro va a su cuenta de Wompi).
  const { data: product } = await supabase
    .from("products")
    .select("creator_id")
    .eq("id", category.product_id)
    .maybeSingle();
  const isProductOwner = product?.creator_id === user.id;

  const { data: bonusFiles } = isProductOwner
    ? await supabase
        .from("product_files")
        .select("id, file_name, display_name")
        .eq("product_id", category.product_id)
        .order("order_index")
    : { data: null };

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex flex-col gap-2">
        <p className="text-sm text-foreground/60">Metodología Poderosa — tu categoría</p>
        <CategoryTitleEditor categoryId={category.id} initialTitle={category.title} />
      </div>

      <ModuleList categoryId={category.id} initialModules={modules ?? []} />

      {isProductOwner && (
        <div className="w-full max-w-2xl">
          <BonusFileManager productId={category.product_id} initialFiles={bonusFiles ?? []} />
        </div>
      )}
    </div>
  );
}
