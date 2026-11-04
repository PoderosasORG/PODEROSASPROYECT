import Link from "next/link";

export function ProductCard({
  href,
  image,
  kicker,
  title,
  status,
  cta,
}: {
  href: string;
  image: string;
  kicker: string;
  title: string;
  status: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-gold-light/60 bg-white overflow-hidden hover:border-gold transition-colors"
    >
      <div className="aspect-video w-full overflow-hidden bg-beige-light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wide text-gold font-medium">{kicker}</p>
        <p className="font-serif text-lg text-foreground leading-snug">{title}</p>
        <p className="text-xs text-foreground/50">{status}</p>
        <span className="mt-2 text-xs font-medium text-gold group-hover:underline">{cta} →</span>
      </div>
    </Link>
  );
}
