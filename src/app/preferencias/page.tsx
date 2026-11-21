import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { savePreferences } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preferencias de comunicación | PODEROSAS", robots: { index: false } };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function PreferenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; ok?: string; error?: string }>;
}) {
  const { t, ok, error } = await searchParams;
  const admin = createAdminClient();

  let email: string | null = null;
  let optIn = false;
  if (t && UUID_RE.test(t)) {
    const { data } = await admin.from("communication_preferences").select("email, marketing_opt_in").eq("manage_token", t).maybeSingle();
    email = data?.email ?? null;
    optIn = data?.marketing_opt_in === true;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      email = user.email.toLowerCase();
      const { data } = await admin.from("communication_preferences").select("marketing_opt_in").eq("email", email).maybeSingle();
      optIn = data?.marketing_opt_in === true;
    }
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-beige-light px-6 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-gold-light/60 bg-white p-8 flex flex-col gap-5">
        <h1 className="font-serif text-3xl">Tus preferencias de comunicación</h1>
        {!email ? (
          <p className="text-sm text-foreground/70">
            {error ? "No pudimos identificar tu correo. " : ""}Usa el enlace que llega en nuestros correos o{" "}
            <Link href="/login?next=/preferencias" className="text-gold hover:underline">
              inicia sesión
            </Link>{" "}
            para ver tus preferencias.
          </p>
        ) : (
          <form action={savePreferences} className="flex flex-col gap-5">
            {t ? <input type="hidden" name="t" value={t} /> : null}
            <p className="text-sm text-foreground/60">Correo: <strong className="text-foreground">{email}</strong></p>

            <div className="rounded-2xl bg-beige-light/60 p-4 text-sm">
              <p className="font-medium">Mensajes operativos</p>
              <p className="text-foreground/60 mt-1">
                Confirmaciones de compra, accesos, calendario de clases y avisos de vencimiento. Siempre los recibirás
                mientras tengas una compra activa, porque son necesarios para tu curso.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-gold-light/60 p-4 text-sm">
              <input type="checkbox" name="marketing" defaultChecked={optIn} className="mt-1" />
              <span>
                <span className="font-medium">Novedades, lanzamientos y promociones</span>
                <span className="block text-foreground/60 mt-1">
                  Nuevos cursos, eventos y ofertas de PODEROSAS. Solo te escribimos si lo activas, y puedes quitarlo cuando quieras.
                </span>
              </span>
            </label>

            {ok ? <p className="text-sm text-emerald-700">¡Listo! Guardamos tus preferencias.</p> : null}
            <button className="self-start rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">
              Guardar preferencias
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
