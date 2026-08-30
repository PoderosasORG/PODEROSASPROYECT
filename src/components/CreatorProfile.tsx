import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";
import {
  DESKTOP_CANVAS,
  MOBILE_CANVAS,
  COVER_HEIGHT,
  FONT_STACKS,
  DEFAULT_THEME,
  DEFAULT_BIO_STYLE,
  DEFAULT_TEXT_STYLE,
  type Device,
  type DevicePosition,
  type PanelBlock,
  type Theme,
  type BioStyle,
} from "@/lib/panelLayout";

type Product = {
  id: string;
  title: string;
  description: string;
  price: string;
};

type CreatorProfileProps = {
  slug: string;
  name: string;
  initials: string;
  role: string;
  bio: string;
  avatarUrl?: string | null;
  avatarSizeMobile?: number;
  avatarSizeDesktop?: number;
  avatarPosition?: DevicePosition;
  bioPosition?: DevicePosition;
  bioStyle?: BioStyle;
  theme?: Theme;
  coverUrl?: string | null;
  coverOffsetY?: number;
  blocks?: PanelBlock[];
  products: Product[];
};

function BlockContent({ block, theme }: { block: PanelBlock; theme: Theme }) {
  if (block.block_type === "image" && block.media_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={block.media_url} alt="" className="h-full w-full object-cover" />;
  }
  if (block.block_type === "video" && block.media_url) {
    return (
      <video
        src={block.media_url}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
    );
  }
  if (block.block_type === "text") {
    const style = block.text_style ?? DEFAULT_TEXT_STYLE;
    return (
      <div
        className="h-full w-full flex items-center justify-center text-center px-2 overflow-hidden"
        style={{
          color: style.color,
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? "italic" : "normal",
          fontSize: style.fontSize,
        }}
      >
        {block.text_content}
      </div>
    );
  }
  if (block.block_type === "product") {
    return (
      <div className="h-full w-full bg-white flex flex-col overflow-hidden">
        {block.product_cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.product_cover} alt="" className="w-full h-2/3 object-cover" />
        )}
        <div className="flex-1 flex flex-col justify-center px-2 gap-0.5">
          <p className="text-xs font-medium truncate">{block.product_title}</p>
          <span className="text-xs" style={{ color: theme.accentColor }}>
            {block.product_price}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function HeroCanvas({
  device,
  name,
  initials,
  role,
  bio,
  avatarUrl,
  avatarSize,
  avatarPosition,
  bioPosition,
  bioStyle,
  theme,
  coverUrl,
  coverOffsetY,
  blocks,
}: {
  device: Device;
  name: string;
  initials: string;
  role: string;
  bio: string;
  avatarUrl?: string | null;
  avatarSize: number;
  avatarPosition: DevicePosition;
  bioPosition: DevicePosition;
  bioStyle: BioStyle;
  theme: Theme;
  coverUrl?: string | null;
  coverOffsetY: number;
  blocks: PanelBlock[];
}) {
  const canvas = device === "mobile" ? MOBILE_CANVAS : DESKTOP_CANVAS;
  const deviceBlocks = blocks.filter((b) => b.device === device).sort((a, b) => a.z_index - b.z_index);

  return (
    <div
      className={device === "mobile" ? "w-full md:hidden" : "hidden w-full md:block"}
      style={{ backgroundColor: theme.bgColor }}
    >
      <div
        className="relative w-full mx-auto overflow-hidden"
        style={{ maxWidth: canvas.width, height: canvas.height }}
      >
        <div
          className="absolute top-0 left-0 right-0 bg-gold-light/40 overflow-hidden"
          style={{ height: COVER_HEIGHT[device] }}
        >
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `center ${coverOffsetY}%` }}
            />
          )}
        </div>

        {deviceBlocks.map((block) => (
          <div
            key={block.id}
            className="absolute rounded-lg overflow-hidden border-2 border-white shadow-sm"
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: `${block.width}%`,
              height: `${block.height}%`,
              transform: "translate(-50%, -50%)",
              zIndex: block.z_index,
            }}
          >
            <BlockContent block={block} theme={theme} />
          </div>
        ))}

        <div
          className="absolute flex flex-col items-center gap-2 text-center"
          style={{
            left: `${avatarPosition[device].x}%`,
            top: `${avatarPosition[device].y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="rounded-full bg-gradient-to-br from-pink-light to-gold-light flex items-center justify-center text-3xl border-4 border-white shadow-inner overflow-hidden"
            style={{ height: avatarSize, width: avatarSize }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <h1 className="text-2xl whitespace-nowrap" style={{ color: theme.textColor }}>
            {name}
          </h1>
          <p className="uppercase tracking-wide text-xs" style={{ color: theme.accentColor }}>
            {role}
          </p>
        </div>

        <p
          className="absolute max-w-[80%] bg-white/70 rounded-xl px-3 py-2"
          style={{
            left: `${bioPosition[device].x}%`,
            top: `${bioPosition[device].y}%`,
            transform: "translate(-50%, -50%)",
            color: theme.textColor,
            fontWeight: bioStyle.bold ? 700 : 400,
            fontStyle: bioStyle.italic ? "italic" : "normal",
            fontSize: bioStyle.fontSize,
          }}
        >
          {bio}
        </p>
      </div>
    </div>
  );
}

export function CreatorProfile({
  slug,
  name,
  initials,
  role,
  bio,
  avatarUrl,
  avatarSizeMobile = 128,
  avatarSizeDesktop = 220,
  avatarPosition = { mobile: { x: 50, y: 18 }, desktop: { x: 50, y: 50 } },
  bioPosition = { mobile: { x: 50, y: 40 }, desktop: { x: 75, y: 50 } },
  bioStyle = DEFAULT_BIO_STYLE,
  theme = DEFAULT_THEME,
  coverUrl,
  coverOffsetY = 50,
  blocks = [],
  products,
}: CreatorProfileProps) {
  return (
    <div
      className="flex flex-col flex-1"
      style={{ backgroundColor: theme.bgColor, color: theme.textColor, fontFamily: FONT_STACKS[theme.fontFamily] }}
    >
      <section className="flex flex-col items-center gap-4 px-6 pt-6">
        <Link href="/" className="text-sm hover:underline self-center" style={{ color: theme.accentColor }}>
          ← Volver a Poderosas
        </Link>
        <HeroCanvas
          device="mobile"
          name={name}
          initials={initials}
          role={role}
          bio={bio}
          avatarUrl={avatarUrl}
          avatarSize={avatarSizeMobile}
          avatarPosition={avatarPosition}
          bioPosition={bioPosition}
          bioStyle={bioStyle}
          theme={theme}
          coverUrl={coverUrl}
          coverOffsetY={coverOffsetY}
          blocks={blocks}
        />
        <HeroCanvas
          device="desktop"
          name={name}
          initials={initials}
          role={role}
          bio={bio}
          avatarUrl={avatarUrl}
          avatarSize={avatarSizeDesktop}
          avatarPosition={avatarPosition}
          bioPosition={bioPosition}
          bioStyle={bioStyle}
          theme={theme}
          coverUrl={coverUrl}
          coverOffsetY={coverOffsetY}
          blocks={blocks}
        />
      </section>

      <section className="px-6 py-16 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <h2 className="text-2xl text-center">Membresía</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 border border-gold-light/60 text-center text-foreground">
            <p className="text-lg">Membresía mensual</p>
            <p className="text-sm text-foreground/60 mt-2">
              Acceso a contenido exclusivo y comunidad.
            </p>
            <button
              className="mt-4 rounded-full px-6 py-2 text-sm text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: theme.accentColor }}
            >
              Próximamente
            </button>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-gold-light/60 text-center text-foreground">
            <p className="text-lg">Membresía anual</p>
            <p className="text-sm text-foreground/60 mt-2">
              Todo lo mensual + beneficios adicionales.
            </p>
            <button
              className="mt-4 rounded-full px-6 py-2 text-sm text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: theme.accentColor }}
            >
              Próximamente
            </button>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto w-full flex flex-col gap-8">
        <h2 className="text-2xl text-center">Productos digitales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-white p-6 border border-gold-light/60 flex flex-col gap-3 text-foreground"
            >
              <p className="text-lg">{product.title}</p>
              <p className="text-sm text-foreground/60 flex-1">
                {product.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: theme.accentColor }}>
                  {product.price}
                </span>
                <BuyButton productId={product.id} slug={slug} accentColor={theme.accentColor} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 max-w-3xl mx-auto w-full text-center flex flex-col gap-4">
        <h2 className="text-2xl">Eventos presenciales</h2>
        <p className="text-foreground/60 text-sm">
          Próximamente podrás reservar tu cupo aquí.
        </p>
      </section>
    </div>
  );
}
