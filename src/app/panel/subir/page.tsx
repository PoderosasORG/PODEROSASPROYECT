import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadWizard } from "@/components/UploadWizard";

export default async function SubirContenidoPage() {
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

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16">
      <UploadWizard creatorId={creator.id} creatorName={creator.display_name} />
    </div>
  );
}
