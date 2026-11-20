import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Exige sesión + estar en admin_members. Se llama en el layout de
 * /admin Y dentro de cada Server Action / ruta, porque las acciones se
 * pueden invocar con un POST directo sin pasar por el layout.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: member } = await supabase
    .from("admin_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) redirect("/panel");

  return { user };
}
