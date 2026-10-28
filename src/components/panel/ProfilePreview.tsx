import { type ReactNode } from "react";
import { type ImageFocus, type Theme, type ContentBlock, FONT_STACKS, alignClasses } from "@/lib/panel/types";
import { sanitizeRichText } from "@/lib/panel/sanitize";

function BlockRender({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    if (!block.html || block.html === "<p></p>") return null;
    return <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.html) }} />;
  }
  if (block.type === "image") {
    if (!block.image?.url) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.image.url}
        alt={block.alt}
        className={`w-full rounded-2xl object-cover aspect-video ${alignClasses(block.align ?? "center")}`}
        style={{ objectPosition: `${block.image.focusX}% ${block.image.focusY}%` }}
      />
    );
  }
  if (block.type === "video") {
    if (!block.url) return null;
    return <video src={block.url} controls className={`w-full rounded-2xl ${alignClasses(block.align ?? "center")}`} />;
  }
  return null;
}

// Puramente visual, sin acceso a datos externos — se usa igual en la
// vista previa en vivo del panel (con datos todavía sin guardar) y,
// envuelto en PublicProfile, en la página pública real.
export function ProfilePreview({
  displayName,
  role,
  avatar,
  cover,
  bio,
  theme,
  blocks,
  afterContent,
}: {
  displayName: string;
  role: string;
  avatar: ImageFocus;
  cover: ImageFocus;
  bio: string;
  theme: Theme;
  blocks: ContentBlock[];
  afterContent?: ReactNode;
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
        className="h-64 sm:h-[26rem] w-full bg-black/5 bg-cover"
        style={cover.url ? { backgroundImage: `url(${cover.url})`, backgroundPosition: `${cover.focusX}% ${cover.focusY}%` } : undefined}
      />
      <div className="flex flex-col items-center gap-3 -mt-16 px-6 text-center">
        <div
          className="h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden bg-black/10 shadow-lg"
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
        <h1 className="font-serif text-3xl sm:text-4xl">{displayName}</h1>
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: theme.accentColor }}>
          {role}
        </p>
        {bio && bio !== "<p></p>" && (
          <div className="max-w-md" dangerouslySetInnerHTML={{ __html: sanitizeRichText(bio) }} />
        )}
      </div>

      {afterContent && (
        <nav className="sticky top-0 z-10 flex justify-center gap-6 mt-8 py-2.5 text-sm backdrop-blur bg-white/70 border-y border-black/5">
          <a href="#" className="hover:underline" style={{ color: theme.accentColor }}>
            Sobre mí
          </a>
          <a href="#cursos" className="hover:underline" style={{ color: theme.accentColor }}>
            Cursos
          </a>
          <a href="#otras-poderosas" className="hover:underline" style={{ color: theme.accentColor }}>
            Otras Poderosas
          </a>
        </nav>
      )}

      {blocks.length > 0 && (
        <div className="flex flex-col gap-6 px-6 py-10 max-w-2xl mx-auto w-full">
          {blocks.map((block) => (
            <BlockRender key={block.id} block={block} />
          ))}
        </div>
      )}

      {afterContent}
    </div>
  );
}
