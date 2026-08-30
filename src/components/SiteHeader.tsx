import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/70 border-b border-gold-light/40">
      <Link href="/" className="font-serif text-lg text-gold">
        Poderosas
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/panel" className="hover:text-gold">
              Mi panel
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-gold">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-gold px-4 py-1.5 text-white hover:bg-gold-light hover:text-foreground transition-colors"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
