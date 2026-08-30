import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PanelEditor } from "@/components/PanelEditor";

export default async function PersonalizarPage() {
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
    .select("id, title, price_cents, currency, cover_image_url")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false });

  const { data: blocks } = await supabase
    .from("panel_blocks")
    .select("*")
    .eq("creator_id", creator.id)
    .order("z_index", { ascending: true });

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-serif text-3xl">Personaliza tu panel</h1>
        <Link href="/panel" className="text-sm text-gold hover:underline">
          ← Volver
        </Link>
      </div>

      <PanelEditor creator={creator} products={products ?? []} initialBlocks={blocks ?? []} />
    </div>
  );
}
