import { redirect } from "next/navigation";
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

  // Puck necesita un único contenedor con altura fija, sin anidarlo
  // dentro de varios divs con flexbox/posicionamiento alrededor — eso
  // rompe su arrastrar-y-soltar (bug conocido de Puck con "canvas
  // envuelto en contenedores posicionados": github.com/puckeditor/puck/issues/1717).
  return <PuckPanelEditor slug={creator.slug} initialData={creator.puck_data} />;
}
