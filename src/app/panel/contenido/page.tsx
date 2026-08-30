import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContentList } from "@/components/ContentList";

export default async function ContenidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) {
    redirect("/panel");
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("creator_id", creator.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-serif text-3xl">Tu contenido</h1>
        <Link
          href="/panel/subir"
          className="rounded-full bg-gold px-5 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
        >
          + Subir nuevo
        </Link>
      </div>

      <ContentList products={products ?? []} creatorSlug={creator.slug} />
    </div>
  );
}
