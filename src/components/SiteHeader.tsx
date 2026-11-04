import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white/70 border-b border-gold-light/40">
      <Link href="/" className="font-serif text-2xl text-gold shrink-0">
        PODEROSAS
      </Link>
      <nav className="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
        {user ? (
          <>
            <Link href="/panel" className="hover:text-gold whitespace-nowrap">
              Mi panel
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-gold whitespace-nowrap">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-gold px-4 py-1.5 text-white hover:bg-gold-light hover:text-foreground transition-colors whitespace-nowrap"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
