import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PuckPanelEditor } from "@/components/PuckPanelEditor";

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
    .select("id, slug, puck_data")
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) {
    redirect("/panel");
  }

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-beige-light">
        <h1 className="font-serif text-xl">Personaliza tu página</h1>
        <Link href="/panel" className="text-sm text-gold hover:underline">
          ← Volver
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <PuckPanelEditor slug={creator.slug} initialData={creator.puck_data} />
      </div>
    </div>
  );
}
