import Link from "next/link";
import { CREATOR_FALLBACK_PHOTOS } from "@/lib/creatorPhotos";

type ProfileCardProps = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  avatarUrl?: string | null;
};

export function ProfileCard({ slug, name, role, bio, avatarUrl }: ProfileCardProps) {
  const photo = avatarUrl || CREATOR_FALLBACK_PHOTOS[slug] || null;

  return (
    <Link
      href={`/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-gold-light/50 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-beige">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={name}
            className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="flex flex-col items-center text-center gap-2 px-6 py-7">
        <h3 className="font-serif text-2xl">{name}</h3>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">{role}</p>
        <p className="text-sm text-foreground/70 max-w-xs">{bio}</p>
        <span className="mt-2 text-sm font-medium text-gold group-hover:text-foreground transition-colors">
          Ver perfil →
        </span>
      </div>
    </Link>
  );
}
