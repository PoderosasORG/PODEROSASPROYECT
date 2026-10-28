import { CreatorCoursesSection, OtherCreatorsSection } from "@/components/CreatorCoursesSection";
import { ProfilePreview } from "@/components/panel/ProfilePreview";
import { type ImageFocus, type Theme, type ContentBlock } from "@/lib/panel/types";
import { CREATOR_FALLBACK_PHOTOS } from "@/lib/creatorPhotos";

export function PublicProfile({
  creatorId,
  slug,
  displayName,
  role,
  avatar,
  cover,
  bio,
  theme,
  blocks,
}: {
  creatorId: string;
  slug: string;
  displayName: string;
  role: string;
  avatar: ImageFocus;
  cover: ImageFocus;
  bio: string;
  theme: Theme;
  blocks: ContentBlock[];
}) {
  // Si la creadora todavía no subió su propia foto desde el panel,
  // usamos su foto real como respaldo en vez de dejar el espacio vacío.
  const fallback = CREATOR_FALLBACK_PHOTOS[slug];
  const avatarWithFallback = avatar.url ? avatar : { ...avatar, url: fallback ?? avatar.url };
  const coverWithFallback = cover.url ? cover : { ...cover, url: fallback ?? cover.url };

  return (
    <ProfilePreview
      displayName={displayName}
      role={role}
      avatar={avatarWithFallback}
      cover={coverWithFallback}
      bio={bio}
      theme={theme}
      blocks={blocks}
      afterContent={
        <>
          <CreatorCoursesSection creatorId={creatorId} slug={slug} accentColor={theme.accentColor} />
          <OtherCreatorsSection excludeSlug={slug} />
        </>
      }
    />
  );
}
