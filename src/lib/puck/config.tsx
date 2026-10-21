import type { Config } from "@puckeditor/core";
import { colorField, imageUploadField, productPickerField } from "@/lib/puck/fields";
import { DEFAULT_IMAGE_VALUE, type ImageValue } from "@/lib/puck/ImageUploadFieldRender";
import { ProductCardDisplay } from "@/lib/puck/ProductCardDisplay";

// Mapea 1:1 los tipos de bloque que ya existían en el editor casero
// (imagen, video, texto, producto), más un bloque nuevo de "cursos"
// para la plataforma. A diferencia del editor viejo, Puck apila los
// bloques en orden (sin x/y) — el responsive queda resuelto solo.

const FONT_STACKS: Record<string, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  rounded: "Verdana, 'Trebuchet MS', sans-serif",
  script: "var(--font-dancing-script), cursive",
  elegant: "var(--font-cormorant), serif",
  soft: "var(--font-quicksand), sans-serif",
  editorial: "var(--font-italiana), serif",
};

type RootProps = {
  avatarUrl: ImageValue;
  coverUrl: ImageValue;
  bio: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
};

type ImageProps = { url: ImageValue; alt: string };
type VideoProps = { url: string };
type TextProps = { content: string; fontSize: number; bold: boolean };
// La creadora pega el ID del producto (visible en /panel/contenido).
// Es la versión más simple que funciona hoy; un selector visual de
// productos propios queda para una siguiente vuelta.
type ProductProps = { productId: string };

export const puckConfig: Config<
  {
    ImageBlock: ImageProps;
    VideoBlock: VideoProps;
    TextBlock: TextProps;
    ProductBlock: ProductProps;
  },
  RootProps
> = {
  root: {
    fields: {
      avatarUrl: imageUploadField("Foto de perfil"),
      coverUrl: imageUploadField("Foto de portada"),
      bio: { type: "textarea", label: "Bio" },
      bgColor: colorField("Color de fondo"),
      textColor: colorField("Color de texto"),
      accentColor: colorField("Color de acento"),
      fontFamily: {
        type: "select",
        label: "Tipografía",
        options: [
          { label: "Serif elegante", value: "serif" },
          { label: "Sans moderna", value: "sans" },
          { label: "Redondeada", value: "rounded" },
          { label: "Manuscrita (femenina)", value: "script" },
          { label: "Elegante suave", value: "elegant" },
          { label: "Soft / redondeada 2", value: "soft" },
          { label: "Editorial fina", value: "editorial" },
        ],
      },
    },
    defaultProps: {
      avatarUrl: DEFAULT_IMAGE_VALUE,
      coverUrl: DEFAULT_IMAGE_VALUE,
      bio: "",
      bgColor: "#FDF6EE",
      textColor: "#2A2420",
      accentColor: "#C9A24B",
      fontFamily: "serif",
    },
    render: ({ puck, avatarUrl, coverUrl, bio, bgColor, textColor, accentColor, fontFamily }) => (
      <div
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontFamily: FONT_STACKS[fontFamily] ?? FONT_STACKS.serif,
          minHeight: "100%",
          ["--accent" as string]: accentColor,
        }}
        className="flex flex-col"
      >
        <div
          className="h-40 sm:h-64 w-full bg-black/5 bg-cover"
          style={
            coverUrl?.url
              ? { backgroundImage: `url(${coverUrl.url})`, backgroundPosition: `${coverUrl.focusX}% ${coverUrl.focusY}%` }
              : undefined
          }
        />
        <div className="flex flex-col items-center gap-3 -mt-12 px-6">
          <div
            className="h-24 w-24 rounded-full overflow-hidden bg-black/10"
            style={{ border: `4px solid ${accentColor}` }}
          >
            {avatarUrl?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl.url}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: `${avatarUrl.focusX}% ${avatarUrl.focusY}%` }}
              />
            )}
          </div>
          {bio && <p className="text-sm text-center max-w-md">{bio}</p>}
        </div>
        <div className="flex flex-col gap-6 px-6 py-10">{puck.renderDropZone({ zone: "content" })}</div>
      </div>
    ),
  },
  components: {
    ImageBlock: {
      label: "Imagen",
      fields: {
        url: imageUploadField("Imagen"),
        alt: { type: "text", label: "Descripción (accesibilidad)" },
      },
      defaultProps: { url: DEFAULT_IMAGE_VALUE, alt: "" },
      render: ({ url, alt }) =>
        url?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url.url}
            alt={alt}
            className="w-full aspect-video rounded-2xl object-cover"
            style={{ objectPosition: `${url.focusX}% ${url.focusY}%` }}
          />
        ) : (
          <div className="w-full aspect-video rounded-2xl bg-black/5 flex items-center justify-center text-sm text-foreground/40">
            Sube una imagen
          </div>
        ),
    },
    VideoBlock: {
      label: "Video",
      fields: {
        url: { type: "text", label: "URL del video (YouTube, Vimeo, mp4)" },
      },
      defaultProps: { url: "" },
      render: ({ url }) =>
        url ? (
          <video src={url} controls className="w-full rounded-2xl" />
        ) : (
          <div className="w-full aspect-video rounded-2xl bg-black/5 flex items-center justify-center text-sm text-foreground/40">
            Agrega la URL de un video
          </div>
        ),
    },
    TextBlock: {
      label: "Texto",
      fields: {
        content: { type: "textarea", label: "Contenido" },
        fontSize: { type: "number", label: "Tamaño de letra (px)" },
        bold: { type: "radio", label: "Negrita", options: [{ label: "Sí", value: true }, { label: "No", value: false }] },
      },
      defaultProps: { content: "Escribe algo...", fontSize: 16, bold: false },
      render: ({ content, fontSize, bold }) => (
        <p style={{ fontSize, fontWeight: bold ? 700 : 400 }}>{content}</p>
      ),
    },
    ProductBlock: {
      label: "Producto",
      fields: {
        productId: productPickerField("Producto"),
      },
      defaultProps: { productId: "" },
      render: ({ productId }) => <ProductCardDisplay productId={productId} />,
    },
  },
};

export type { RootProps };
