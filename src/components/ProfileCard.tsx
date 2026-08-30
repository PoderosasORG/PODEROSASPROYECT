import Link from "next/link";

type ProfileCardProps = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  avatarUrl?: string | null;
};

export function ProfileCard({ slug, name, role, bio, initials, avatarUrl }: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center text-center gap-4 bg-white/70 rounded-3xl p-8 border border-gold-light/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-pink-light to-gold-light flex items-center justify-center text-3xl font-serif text-foreground border-4 border-white shadow-inner overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>
      <div>
        <h3 className="font-serif text-2xl">{name}</h3>
        <p className="text-sm uppercase tracking-wide text-gold">{role}</p>
      </div>
      <p className="text-sm text-foreground/70 max-w-xs">{bio}</p>
      <Link
        href={`/${slug}`}
        className="mt-2 inline-block rounded-full bg-gold px-6 py-2 text-sm font-medium text-white hover:bg-gold-light hover:text-foreground transition-colors"
      >
        Ver perfil
      </Link>
    </div>
  );
}
