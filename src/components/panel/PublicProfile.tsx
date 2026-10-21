import { CreatorCoursesSection, OtherCreatorsSection } from "@/components/CreatorCoursesSection";
import { ProfilePreview } from "@/components/panel/ProfilePreview";
import { type ImageFocus, type Theme, type ContentBlock } from "@/lib/panel/types";

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
  return (
    <ProfilePreview
      displayName={displayName}
      role={role}
      avatar={avatar}
      cover={cover}
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
