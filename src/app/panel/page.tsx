import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { AvatarUploadField } from "@/components/AvatarUploadField";
import { ProductCard } from "@/components/panel/ProductCard";

const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

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

  const { count: purchaseCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", user.id)
    .eq("status", "approved");

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

  const displayName = profile?.full_name ?? user.email;
  const firstName = displayName ? displayName.split(/\s+/)[0] : "";

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-8">
      <div className="w-full max-w-4xl flex items-start justify-between gap-4">
        <div>
          <span className="uppercase tracking-[0.25em] text-xs text-gold font-medium">
            Tu espacio en Poderosas
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">
            Hola{firstName ? `, ${firstName}` : ""}.
          </h1>
        </div>
        <LogoutButton />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gold-light/60 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gold-light/40 text-gold font-serif text-lg flex items-center justify-center">
              {(displayName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-foreground/50">
                {profile?.role === "creator" ? "Creadora" : "Cliente"}
              </p>
            </div>
          </div>
          <div className="border-t border-gold-light/30 pt-4">
            <p className="text-xs uppercase tracking-wide text-foreground/40">Correo</p>
            <p className="text-sm text-foreground/80 mt-0.5">{user.email}</p>
          </div>
        </div>

        {creator && (
          <div className="bg-white rounded-2xl border border-gold-light/60 shadow-sm p-6 flex flex-col items-center gap-3">
            <h2 className="font-serif text-xl">Foto de perfil</h2>
            <p className="text-xs text-foreground/60 text-center max-w-xs">
              Se actualiza en el home y en tu página pública en cuanto la cambies.
            </p>
            <AvatarUploadField creatorId={creator.id} currentAvatarUrl={creator.avatar_url} />
          </div>
        )}
      </div>

      {creator ? (
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gold-light/60 shadow-sm p-6 flex flex-col gap-5">
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
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gold-light/60 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              📚
            </span>
            <h2 className="font-serif text-xl">Tus compras</h2>
          </div>
          {purchaseCount && purchaseCount > 0 ? (
            <p className="text-sm text-foreground/60">
              Tienes {purchaseCount} {purchaseCount === 1 ? "curso o producto activo" : "cursos o productos activos"}.
              Entra cuando quieras, a tu ritmo.
            </p>
          ) : (
            <p className="text-sm text-foreground/60">
              Todavía no has comprado nada. Cuando compres un curso o producto, lo verás aquí.
            </p>
          )}
          <Link
            href="/mis-compras"
            className="self-start rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
          >
            Ver mis compras
          </Link>
        </div>
      )}

      {/* Productos de Poderosas — visible para cualquiera con cuenta, haya
          comprado o no, para que pueda ver qué hay disponible (evento,
          curso) y qué está en camino, además de material gratuito.
          Miniaturas de prueba hasta que haya fotos/archivos reales. */}
      <div className="w-full max-w-4xl flex flex-col gap-4">
        <h2 className="font-serif text-xl">Productos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProductCard
            href="/evento"
            image="/images/evento/foto-1.jpg"
            kicker="Evento presencial"
            title="Masterclass PODEROSAS 2026"
            status="21 de noviembre · Bogotá"
            cta="Ver evento"
          />
          <ProductCard
            href="/cursos/metodologia-poderosa"
            image="/images/creators/landing-hero.webp"
            kicker="Curso virtual"
            title="Metodología Poderosa"
            status="En proceso · lista de espera"
            cta="Regístrate"
          />
          <ProductCard
            href="/recursos/ebook-relaciones"
            image="/images/cartilla-metodologia/cartilla-portada.jpg"
            kicker="Material gratuito"
            title="Ebook de relaciones de pareja"
            status="Próximamente"
            cta="Avísenme"
          />
          <ProductCard
            href="/recursos/plantillas-bienestar"
            image="/images/cartilla-metodologia/cartilla-ejercicio-1.jpg"
            kicker="Material gratuito"
            title="10 plantillas de bienestar emocional"
            status="Próximamente"
            cta="Avísenme"
          />
        </div>
      </div>

      {/* Contacto — pequeño y funcional a propósito: en paneles reales de
          plataformas de cursos (Teachable, Heights) el soporte se muestra
          como un enlace discreto, no como un bloque con fotos de las
          fundadoras, que se sentiría fuera de lugar en una pantalla de
          cuenta. */}
      <div className="w-full max-w-4xl flex items-center justify-center gap-2 text-sm text-foreground/50">
        <span aria-hidden>✦</span>
        <span>
          ¿Tienes alguna duda? Escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </span>
      </div>
    </div>
  );
}
