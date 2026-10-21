import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicProfile } from "@/components/panel/PublicProfile";
import { DEFAULT_IMAGE_FOCUS, DEFAULT_TEXT_STYLE, DEFAULT_THEME } from "@/lib/panel/types";

// Siempre trae datos frescos: sin esto, el navegador puede mostrar
// una versión en caché del perfil justo después de guardar cambios.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("creators")
    .select(
      "id, slug, display_name, avatar_url, avatar_focus_x, avatar_focus_y, cover_image_url, cover_focus_x, cover_focus_y, bio, bio_style, theme, content_blocks",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!creator) {
    notFound();
  }

  return (
    <PublicProfile
      creatorId={creator.id}
      slug={creator.slug}
      displayName={creator.display_name}
      role={creator.slug === "kat" ? "Fundadora de Poderosas" : "Poderosa"}
      avatar={
        creator.avatar_url
          ? { url: creator.avatar_url, focusX: creator.avatar_focus_x ?? 50, focusY: creator.avatar_focus_y ?? 50 }
          : DEFAULT_IMAGE_FOCUS
      }
      cover={
        creator.cover_image_url
          ? { url: creator.cover_image_url, focusX: creator.cover_focus_x ?? 50, focusY: creator.cover_focus_y ?? 50 }
          : DEFAULT_IMAGE_FOCUS
      }
      bio={creator.bio ?? ""}
      bioStyle={creator.bio_style ?? DEFAULT_TEXT_STYLE}
      theme={creator.theme ?? DEFAULT_THEME}
      blocks={creator.content_blocks ?? []}
    />
  );
}
