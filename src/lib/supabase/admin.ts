import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la Service Role Key: ignora RLS por completo.
// SOLO se importa desde código de servidor (rutas API, Server
// Components) — "server-only" hace que el build falle si algún
// componente de cliente intenta importarlo por error.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
