import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ModulePlayer } from "@/components/cursos/ModulePlayer";

export default async function VistaPreviaModuloPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/panel/metodologia-poderosa/${moduleId}/vista-previa`);

  // La RLS de category_modules ya deja leer un módulo propio aunque esté
  // en borrador (owner_id = auth.uid()), así que si esta consulta no
  // devuelve nada es que el módulo no existe o no es suyo — nunca hace
  // falta comprobar nada "a mano" aparte de eso.
  const { data: module } = await supabase
    .from("category_modules")
    .select("id, title, description, bunny_video_id, is_published, category_id, course_categories(owner_id)")
    .eq("id", moduleId)
    .maybeSingle();

  if (!module) notFound();

  const category = Array.isArray(module.course_categories) ? module.course_categories[0] : module.course_categories;
  if (category?.owner_id !== user.id) notFound();

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-1">
        <Link href="/panel/metodologia-poderosa" className="text-sm text-gold hover:underline self-start">
          ← Volver a tus módulos
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full ${
              module.is_published ? "bg-gold text-white" : "bg-gold-light/40 text-foreground/70"
            }`}
          >
            {module.is_published ? "Publicado — así lo ve quien compró el curso" : "Borrador — así se verá cuando lo publiques"}
          </span>
        </div>
      </div>

      {!module.bunny_video_id ? (
        <p className="text-sm text-foreground/60 max-w-2xl">
          Este módulo todavía no tiene un video subido.
        </p>
      ) : (
        <div className="w-full max-w-2xl">
          <ModulePlayer module={module} />
        </div>
      )}
    </div>
  );
}
