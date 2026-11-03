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
    redirect("/login?next=/panel");
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

  const { data: ownedCategory } = await supabase
    .from("course_categories")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const actions = creator
    ? [
        { href: "/panel/subir", label: "Subir contenido", primary: true },
        { href: "/panel/contenido", label: "Ver mi contenido", primary: false },
        { href: "/panel/personalizar", label: "Personalizar mi panel", primary: false },
        { href: "/panel/clientes", label: "Mis clientes", primary: false },
        ...(ownedCategory
          ? [{ href: "/panel/metodologia-poderosa", label: "Metodología Poderosa", primary: true }]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="font-serif text-3xl">
          Hola, {profile?.full_name ?? user.email}
        </h1>
        <LogoutButton />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gold-light/60 p-6">
          <p className="text-sm text-foreground/60">Correo</p>
          <p className="mb-4">{user.email}</p>
          <p className="text-sm text-foreground/60">Tipo de cuenta</p>
          <p>{profile?.role === "creator" ? "Creadora" : "Cliente"}</p>
        </div>

        {creator && (
          <div className="bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col items-center gap-3">
            <h2 className="font-serif text-xl">Foto de perfil</h2>
            <p className="text-xs text-foreground/60 text-center max-w-xs">
              Se actualiza en el home y en tu página pública en cuanto la cambies.
            </p>
            <AvatarUploadField creatorId={creator.id} currentAvatarUrl={creator.avatar_url} />
          </div>
        )}
      </div>

      {creator ? (
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-xl">Tu espacio de creadora</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Perfil público: <a className="text-gold hover:underline" href={`/${creator.slug}`}>poderosas.org/{creator.slug}</a>
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.primary
                    ? "rounded-xl bg-gold px-4 py-4 text-white text-sm font-medium text-center hover:bg-gold-light hover:text-foreground transition-colors flex items-center justify-center"
                    : "rounded-xl border border-gold px-4 py-4 text-gold text-sm font-medium text-center hover:bg-gold hover:text-white transition-colors flex items-center justify-center"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gold-light/60 p-6 flex flex-col gap-4">
          <p className="text-sm text-foreground/60">
            Esta cuenta es de cliente. Cuando compres productos y membresías,
            aparecerán en &quot;Mis compras&quot;.
          </p>
          <Link
            href="/mis-compras"
            className="self-start rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Ver mis compras
          </Link>
        </div>
      )}
    </div>
  );
}
