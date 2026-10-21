import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FixedPanelEditor, type PanelData } from "@/components/panel/FixedPanelEditor";
import { DEFAULT_IMAGE_FOCUS, DEFAULT_TEXT_STYLE, DEFAULT_THEME } from "@/lib/panel/types";

export default async function PersonalizarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select(
      "id, slug, avatar_url, avatar_focus_x, avatar_focus_y, cover_image_url, cover_focus_x, cover_focus_y, bio, bio_style, theme, content_blocks",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) {
    redirect("/panel");
  }

  const initial: PanelData = {
    avatar: creator.avatar_url
      ? { url: creator.avatar_url, focusX: creator.avatar_focus_x ?? 50, focusY: creator.avatar_focus_y ?? 50 }
      : DEFAULT_IMAGE_FOCUS,
    cover: creator.cover_image_url
      ? { url: creator.cover_image_url, focusX: creator.cover_focus_x ?? 50, focusY: creator.cover_focus_y ?? 50 }
      : DEFAULT_IMAGE_FOCUS,
    bio: creator.bio ?? "",
    bioStyle: creator.bio_style ?? DEFAULT_TEXT_STYLE,
    theme: creator.theme ?? DEFAULT_THEME,
    blocks: creator.content_blocks ?? [],
  };

  return <FixedPanelEditor slug={creator.slug} initial={initial} />;
}
