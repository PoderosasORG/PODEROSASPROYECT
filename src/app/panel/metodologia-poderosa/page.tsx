import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryTitleEditor } from "@/components/panel/metodologia/CategoryTitleEditor";
import { ModuleList } from "@/components/panel/metodologia/ModuleList";

export default async function MetodologiaPoderosaPanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/panel/metodologia-poderosa");

  const { data: category } = await supabase
    .from("course_categories")
    .select("id, title")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!category) redirect("/panel");

  const { data: modules } = await supabase
    .from("category_modules")
    .select("id, category_id, title, description, bunny_video_id, custom_thumbnail_url, order_index, is_published")
    .eq("category_id", category.id)
    .order("order_index");

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex flex-col gap-2">
        <p className="text-sm text-foreground/60">Metodología Poderosa — tu categoría</p>
        <CategoryTitleEditor categoryId={category.id} initialTitle={category.title} />
      </div>

      <ModuleList categoryId={category.id} initialModules={modules ?? []} />
    </div>
  );
}
