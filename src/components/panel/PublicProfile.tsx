import { CreatorCoursesSection } from "@/components/CreatorCoursesSection";
import {
  type ImageFocus,
  type TextStyle,
  type Theme,
  type ContentBlock,
  FONT_STACKS,
} from "@/lib/panel/types";

function BlockRender({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    return (
      <p style={{ fontSize: block.style.fontSize, fontWeight: block.style.bold ? 700 : 400, fontStyle: block.style.italic ? "italic" : "normal" }}>
        {block.content}
      </p>
    );
  }
  if (block.type === "image") {
    if (!block.image?.url) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.image.url}
        alt={block.alt}
        className="w-full rounded-2xl object-cover aspect-video"
        style={{ objectPosition: `${block.image.focusX}% ${block.image.focusY}%` }}
      />
    );
  }
  if (block.type === "video") {
    if (!block.url) return null;
    return <video src={block.url} controls className="w-full rounded-2xl" />;
  }
  return null;
}

export function PublicProfile({
  creatorId,
  slug,
  displayName,
  role,
  avatar,
  cover,
  bio,
  bioStyle,
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
  bioStyle: TextStyle;
  theme: Theme;
  blocks: ContentBlock[];
}) {
  return (
    <div
      style={{
        backgroundColor: theme.bgColor,
        color: theme.textColor,
        fontFamily: FONT_STACKS[theme.fontFamily] ?? FONT_STACKS.serif,
        minHeight: "100%",
        ["--accent" as string]: theme.accentColor,
      }}
      className="flex flex-col flex-1"
    >
      <div
        className="h-40 sm:h-64 w-full bg-black/5 bg-cover"
        style={cover.url ? { backgroundImage: `url(${cover.url})`, backgroundPosition: `${cover.focusX}% ${cover.focusY}%` } : undefined}
      />
      <div className="flex flex-col items-center gap-2 -mt-12 px-6 text-center">
        <div
          className="h-24 w-24 rounded-full overflow-hidden bg-black/10"
          style={{ border: `4px solid ${theme.accentColor}` }}
        >
          {avatar.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar.url}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `${avatar.focusX}% ${avatar.focusY}%` }}
            />
          )}
        </div>
        <h1 className="font-serif text-2xl">{displayName}</h1>
        <p className="text-xs uppercase tracking-wide" style={{ color: theme.accentColor }}>
          {role}
        </p>
        {bio && (
          <p
            className="max-w-md"
            style={{ fontSize: bioStyle.fontSize, fontWeight: bioStyle.bold ? 700 : 400, fontStyle: bioStyle.italic ? "italic" : "normal" }}
          >
            {bio}
          </p>
        )}
      </div>

      {blocks.length > 0 && (
        <div className="flex flex-col gap-6 px-6 py-10 max-w-2xl mx-auto w-full">
          {blocks.map((block) => (
            <BlockRender key={block.id} block={block} />
          ))}
        </div>
      )}

      <CreatorCoursesSection creatorId={creatorId} slug={slug} accentColor={theme.accentColor} />
    </div>
  );
}
