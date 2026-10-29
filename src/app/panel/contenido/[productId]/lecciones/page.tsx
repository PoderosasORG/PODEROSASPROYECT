import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LessonManager } from "@/components/panel/LessonManager";

export default async function LeccionesPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/panel/contenido/${productId}/lecciones`);
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, title, creator_id, content_type")
    .eq("id", productId)
    .maybeSingle();

  // Mismo criterio que el resto del panel: solo la creadora dueña del
  // curso puede entrar a administrar sus módulos.
  if (!product || product.creator_id !== user.id) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id, title, order_index")
    .eq("product_id", productId)
    .order("order_index", { ascending: true });

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-6 py-16 gap-6">
      <div className="w-full max-w-lg flex flex-col gap-1">
        <Link href="/panel/contenido" className="text-sm text-gold hover:underline">
          ← Volver a tu contenido
        </Link>
        <h1 className="font-serif text-3xl mt-2">Módulos de &ldquo;{product.title}&rdquo;</h1>
        <p className="text-sm text-foreground/60">
          Agrega tus videos como módulos nuevos cuando los tengas listos — no
          hace falta subir todo el curso de una sola vez.
        </p>
      </div>

      <LessonManager productId={product.id} initialLessons={lessons ?? []} />
    </div>
  );
}
