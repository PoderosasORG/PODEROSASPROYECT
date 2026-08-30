import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { AvatarUploadField } from "@/components/AvatarUploadField";

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-serif text-3xl">
          Hola, {profile?.full_name ?? user.email}
        </h1>
        <LogoutButton />
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gold-light/60 p-6">
        <p className="text-sm text-foreground/60">Correo</p>
        <p className="mb-4">{user.email}</p>
        <p className="text-sm text-foreground/60">Tipo de cuenta</p>
        <p>{profile?.role === "creator" ? "Creadora" : "Cliente"}</p>
      </div>

      {creator ? (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 pb-6 border-b border-gold-light/40">
            <h2 className="font-serif text-xl">Foto de perfil</h2>
            <p className="text-xs text-foreground/60 text-center max-w-xs">
              Se actualiza en el home y en tu página pública en cuanto la cambies.
            </p>
            <AvatarUploadField creatorId={creator.id} currentAvatarUrl={creator.avatar_url} />
          </div>

          <h2 className="font-serif text-xl">Tu espacio de creadora</h2>
          <p className="text-sm text-foreground/60">
            Perfil público: <a className="text-gold hover:underline" href={`/${creator.slug}`}>poderosas.org/{creator.slug}</a>
          </p>
          <div className="flex gap-3">
            <Link
              href="/panel/subir"
              className="rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
            >
              Subir contenido
            </Link>
            <Link
              href="/panel/contenido"
              className="rounded-full border border-gold px-6 py-2.5 text-gold text-sm hover:bg-gold hover:text-white transition-colors"
            >
              Ver mi contenido
            </Link>
            <Link
              href="/panel/personalizar"
              className="rounded-full border border-gold px-6 py-2.5 text-gold text-sm hover:bg-gold hover:text-white transition-colors"
            >
              Personalizar mi panel
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gold-light/60 p-6 text-sm text-foreground/60">
          Esta cuenta es de cliente. Cuando compres productos y membresías,
          aparecerán aquí.
        </div>
      )}
    </div>
  );
}
