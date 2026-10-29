import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TicketScanner } from "@/components/TicketScanner";

export default async function EscanerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/escaner");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) {
    redirect("/panel");
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <h1 className="font-serif text-2xl">Escáner de entrada</h1>
      <TicketScanner />
    </div>
  );
}
