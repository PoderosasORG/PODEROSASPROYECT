import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { IntroVideoCard } from "@/components/IntroVideoCard";
import { Countdown } from "@/components/home/Countdown";
import { Gallery } from "@/components/home/Gallery";
import { EVENTO_PRESENCIAL_NOMBRE } from "@/lib/eventoPresencial";
import { CoursePreview } from "@/components/home/CoursePreview";
import {
  LAUNCH_PRICE_CENTS,
  REGULAR_PRICE_CENTS,
  isLaunchPriceActive,
  promoDeadline,
  promoDeadlineLabel,
  promoExtensionMessage,
} from "@/lib/metodologiaPoderosasLanzamiento";

// Home "Academia PODEROSAS" (Kat, 2026-11-20). Distribución visual
// inspirada en sitios de mentoras: foto grande → programas en bloques
// partidos (foto + color) → autoridad → mentoras → contenido. Poco texto,
// botones claros. No se inventan cifras, testimonios ni imágenes.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Academia PODEROSAS | Metodología PODEROSAS 2026–2027",
  description:
    "Mentoras de mujeres PODEROSAS: Luz Amparo, Shei Rivera y Kat Rivera. Metodología PODEROSAS 2026–2027, primera generación: convierte tus sueños en un plan y tu plan en acción.",
  alternates: { canonical: "/" },
};

const CHECKOUT = "/cursos/metodologia-poderosa";

const INTRO_VIDEO_URL =
  "https://asiftmeeaopqqtwgacee.supabase.co/storage/v1/object/public/covers/site/intro-video.mp4";
const INTRO_VIDEO_POSTER =
  "https://asiftmeeaopqqtwgacee.supabase.co/storage/v1/object/public/covers/site/intro-video-poster.jpg";

// Fotos REALES de la primera masterclass: se ponen en
// public/images/masterclass-2026/ y aparecen solas en la galería.
function masterclassPhotos() {
  const dir = path.join(process.cwd(), "public", "images", "masterclass-2026");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort()
      .map((f) => `/images/masterclass-2026/${f}`);
  } catch {
    return [];
  }
}

function cop(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("es-CO")}`;
}

// Productos independientes del ecosistema. Aún no tienen página de venta
// propia: cuando la tengan, se pone el enlace en `href`.
const PRODUCTS = [
  {
    kicker: "Ebook",
    title: "50 Acuerdos de Pareja",
    line: "Para construir relaciones sanas.",
    photo: "/images/creators/shei.webp",
    photoPos: "object-top",
    panel: "bg-[#f7c9d8] text-[#5c1030]",
    href: null as string | null,
  },
  {
    kicker: "Masterclass",
    title: "Marca Personal y Monetización",
    line: "Construye comunidad en redes sociales.",
    photo: "/images/creators/kat-cover.jpg",
    photoPos: "object-[50%_30%]",
    panel: "bg-[#e7dcf5] text-[#3d2463]",
    href: null as string | null,
  },
  {
    kicker: "Reto de 7 días",
    title: "Enfócate en Ti",
    line: "Fortalece tu amor propio.",
    photo: "/images/creators/luz-cover.webp",
    photoPos: "object-top",
    panel: "bg-[#f3e4cf] text-[#6b4423]",
    href: null as string | null,
  },
];

const MENTORAS = [
  { slug: "luz", name: "Luz Amparo", photo: "/images/creators/luz.png", pos: "object-top", focus: "Energía humana, magnetismo, lectura del rostro y de las manos" },
  { slug: "shei", name: "Shei Rivera", photo: "/images/creators/shei.webp", pos: "object-top", focus: "Psicología y bienestar emocional" },
  { slug: "kat", name: "Kat Rivera", photo: "/images/creators/kat.jpg", pos: "object-[50%_35%]", focus: "Comunicación, PNL y productividad" },
];

const TEMAS = [
  "Autoestima y amor propio",
  "Energía y magnetismo",
  "Liderazgo y seguridad",
  "Hábitos positivos",
  "Productividad y tiempo",
  "Relaciones de pareja",
  "Comunicación sana",
  "Meditaciones guiadas",
  "Manifiesto y mantras",
  "Autoconocimiento",
  "Plan de acción de 30 días",
];

const INCLUYE = [
  "6 meses de acceso",
  "6 clases en vivo + grabaciones",
  "Cartilla descargable",
  "Ejercicios prácticos",
  "Comunidad privada de WhatsApp",
  "Meditaciones guiadas",
  "Manifiesto y mantras",
  "Experiencias y eventos",
];

function Button({ href, children, variant = "dark" }: { href: string; children: React.ReactNode; variant?: "dark" | "light" | "outline" }) {
  const styles = {
    dark: "bg-[#2b0f1d] text-white hover:bg-[#5c1030]",
    light: "bg-white text-[#5c1030] hover:bg-beige-light",
    outline: "border border-current hover:bg-white/10",
  }[variant];
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] shadow-md transition-transform hover:-translate-y-0.5 ${styles}`}
    >
      {children}
    </Link>
  );
}

function SectionTitle({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2 className={`text-center text-xl sm:text-3xl font-semibold uppercase tracking-[0.12em] ${light ? "text-white" : "text-[#2b0f1d]"}`}>
      {children}
    </h2>
  );
}

export default function Home() {
  const launch = isLaunchPriceActive();
  const deadlineIso = promoDeadline().toISOString();
  const deadlineLabel = promoDeadlineLabel();
  const extensionMessage = promoExtensionMessage();
  const photos = masterclassPhotos();

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* 1. HERO ---------------------------------------------------------- */}
      <section className="relative isolate w-full overflow-hidden bg-[#2b0f1d] sm:flex sm:aspect-[16/8] lg:aspect-[16/7] sm:items-end sm:justify-center">
        <div className="relative aspect-[2/1] w-full sm:absolute sm:inset-0 sm:-z-10 sm:aspect-auto">
          <Image
            src="/images/creators/portada-mentoras-rosa-2.jpg"
            alt="Shei Rivera, Luz Amparo y Kat Rivera, mentoras de PODEROSAS"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b0f1d] via-transparent to-transparent sm:from-[#2b0f1d]/90 sm:via-[#2b0f1d]/10 sm:via-40%" />
        </div>
        <div className="relative flex flex-col items-center gap-3 px-6 pb-10 pt-2 sm:pt-0 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)]">
            Mentoras de mujeres <br className="sm:hidden" />
            PODEROSAS
          </h1>
          <p className="max-w-2xl font-serif text-lg sm:text-xl italic text-white/90">
            Si lo puedes imaginar, lo puedes lograr. Con coherencia y acción.
          </p>
        </div>
      </section>

      {/* Franja de navegación (como las categorías bajo el hero) */}
      <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-[#2b0f1d]/10 bg-white px-6 py-4 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#2b0f1d]">
        <Link href="#academia" className="hover:text-gold">Academia</Link>
        <Link href="#mentoras" className="hover:text-gold">Mentoras</Link>
        <Link href="/evento#entradas" className="hover:text-gold">Eventos presenciales</Link>
        <Link href="#contenido" className="hover:text-gold">Podcast</Link>
        <Link href={CHECKOUT} className="text-gold hover:underline">Inscríbete</Link>
      </nav>

      {/* 2. ACADEMIA — producto principal en bloque partido -------------- */}
      <section id="academia" className="scroll-mt-16 grid grid-cols-1 md:grid-cols-2">
        <div className="relative flex min-h-[340px] md:min-h-[560px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#fdf2f6] via-[#f7e9f7] to-[#efe4fa] px-4 py-12">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f2a0bf]/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-[#c9b3e6]/40 blur-3xl" aria-hidden />
          <CoursePreview />
        </div>
        <div className="flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#5c1030] via-[#74173f] to-[#2b0f1d] px-6 py-14 text-center text-white">
          <p className="text-[11px] uppercase tracking-[0.35em] text-gold-light">Academia PODEROSAS · Primera generación</p>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight">
            Metodología
            <br />
            PODEROSAS <span className="text-gold-light">2026–2027</span>
          </h2>
          <p className="max-w-sm text-white/85">Convierte tus sueños en un plan y tu plan en acción.</p>
          {launch ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-white/55 line-through">{cop(REGULAR_PRICE_CENTS)}</span>
                <span className="font-serif text-5xl">{cop(LAUNCH_PRICE_CENTS)}</span>
                <span className="text-sm text-white/70">COP</span>
              </div>
              {extensionMessage ? (
                <p className="max-w-sm rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium">{extensionMessage}</p>
              ) : null}
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Hasta el {deadlineLabel}</p>
              <Countdown deadlineIso={deadlineIso} tone="dark" />
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-5xl">{cop(REGULAR_PRICE_CENTS)}</span>
              <span className="text-sm text-white/70">COP</span>
            </div>
          )}
          <Button href={CHECKOUT} variant="light">
            Quiero mi Metodología
          </Button>
        </div>
      </section>

      {/* 3. ECOSISTEMA — productos independientes, bloques alternados ---- */}
      <section aria-label="Nuestros productos">
        {PRODUCTS.map((p, i) => (
          <div key={p.title} className="grid grid-cols-1 md:grid-cols-2">
            <div className={`relative min-h-[280px] md:min-h-[420px] ${i % 2 === 0 ? "md:order-2" : ""}`}>
              <Image src={p.photo} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className={`object-cover ${p.photoPos}`} />
            </div>
            <div className={`flex flex-col items-center justify-center gap-4 px-6 py-14 text-center ${p.panel}`}>
              <p className="text-[11px] uppercase tracking-[0.35em] opacity-70">{p.kicker}</p>
              <h3 className="font-serif text-4xl sm:text-5xl italic leading-tight">{p.title}</h3>
              <p className="opacity-80">{p.line}</p>
              {p.href ? (
                <Button href={p.href}>Conoce más</Button>
              ) : launch ? (
                <Button href="#bonos">Hoy gratis con la Metodología</Button>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">Próximamente</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* 4. BONOS (solo hasta el cierre del lanzamiento) ----------------- */}
      {launch ? (
        <section id="bonos" className="scroll-mt-16 relative overflow-hidden bg-[#2b0f1d] px-6 py-16 text-center text-white">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#e2457a]/25 blur-3xl" aria-hidden />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#8e6bbf]/25 blur-3xl" aria-hidden />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
            <span className="rounded-full border-2 border-dashed border-gold-light px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-gold-light">
              ★ Bonos exclusivos de lanzamiento ★
            </span>
            <SectionTitle light>¡Tu inscripción viene con 3 regalos!</SectionTitle>
            <div className="flex flex-wrap justify-center gap-2">
              {PRODUCTS.map((p) => (
                <span key={p.title} className="rounded-full bg-white/10 px-4 py-2 text-sm">
                  🎁 {p.kicker}: {p.title}
                </span>
              ))}
            </div>
            {extensionMessage ? <p className="max-w-xl text-[#f7c9d8]">{extensionMessage}</p> : null}
            <p className="text-white/75">Compra antes del {deadlineLabel} (hora Colombia).</p>
            <Countdown deadlineIso={deadlineIso} tone="dark" />
            <Button href={CHECKOUT} variant="light">
              Quiero mi Metodología con los 3 bonos
            </Button>
          </div>
        </section>
      ) : null}

      {/* 5. AUTORIDAD (franja corta) ------------------------------------ */}
      <section className="border-y border-[#2b0f1d]/10 bg-white px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { big: "+3 millones", small: "de personas en nuestra comunidad" },
            { big: "7 años", small: "creando contenido" },
            { big: "Hispanoamérica", small: "comunidad en países de habla hispana" },
          ].map((s) => (
            <div key={s.big}>
              <p className="font-serif text-3xl sm:text-4xl text-[#5c1030]">{s.big}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-foreground/55">{s.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. MENTORAS — tarjetas verticales con foto -------------------- */}
      <section id="mentoras" className="scroll-mt-16 bg-[#fbe4ec] px-4 sm:px-6 py-16">
        <SectionTitle>Conoce a tus mentoras</SectionTitle>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 sm:grid-cols-3 gap-5">
          {MENTORAS.map((m) => (
            <Link key={m.slug} href={`/${m.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl shadow-lg">
              <Image
                src={m.photo}
                alt={`${m.name}, mentora de PODEROSAS`}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className={`object-cover ${m.pos} transition-transform duration-700 group-hover:scale-105`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="font-serif text-3xl">{m.name}</p>
                <p className="mt-1 text-sm text-white/85">{m.focus}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">Ver perfil →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 7 + 8. QUÉ APRENDES / QUÉ INCLUYE — en chips, sin párrafos ----- */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-5">
            <SectionTitle>¿Qué vas a aprender?</SectionTitle>
            <div className="flex flex-wrap justify-center gap-2">
              {TEMAS.map((t) => (
                <span key={t} className="rounded-full bg-[#f3ecfa] px-4 py-2 text-sm text-[#3d2463]">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-5">
            <SectionTitle>¿Qué incluye?</SectionTitle>
            <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-3">
              {INCLUYE.map((t) => (
                <div key={t} className="rounded-2xl border border-[#2b0f1d]/10 bg-[#fdf6f9] px-4 py-4 text-center text-sm font-medium">
                  <span className="mb-1 block text-gold">✓</span>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <Button href={CHECKOUT}>Quiero ser parte de PODEROSAS</Button>
        </div>
      </section>

      {/* 9. MASTERCLASS PRESENCIAL --------------------------------------- */}
      <section className="bg-[#fbe4ec] px-4 sm:px-6 py-16">
        <SectionTitle>Así vivimos nuestra primera Masterclass</SectionTitle>
        <p className="mt-2 text-center text-sm text-foreground/60">{EVENTO_PRESENCIAL_NOMBRE} · Bogotá</p>
        <div className="mx-auto mt-8 max-w-5xl">
          {photos.length > 0 ? (
            <Gallery photos={photos} alt={EVENTO_PRESENCIAL_NOMBRE} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-3xl shadow-lg">
              <div className="flex flex-col items-center justify-center gap-4 bg-[#2b0f1d] px-6 py-12 text-center text-white">
                <p className="font-serif text-4xl tracking-wide">SOLD OUT</p>
                <p className="text-white/75">Primera generación agotada. Muy pronto, las fotos.</p>
                <Button href="/evento#entradas" variant="light">
                  Quiero ir a la próxima
                </Button>
              </div>
              <div className="relative min-h-[260px]">
                <Image src="/images/creators/landing-hero.webp" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 10. VIDEO + PODCAST -------------------------------------------- */}
      <section id="contenido" className="scroll-mt-16 bg-beige-light px-4 sm:px-6 pt-16 pb-16">
        <SectionTitle>Conócenos en acción</SectionTitle>
        <IntroVideoCard videoUrl={INTRO_VIDEO_URL} posterUrl={INTRO_VIDEO_POSTER} />
        <div className="mx-auto mt-4 max-w-5xl">
          <p className="mb-4 text-center text-lg sm:text-xl font-semibold uppercase tracking-[0.12em] text-[#2b0f1d]">
            Escucha nuestro podcast
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl bg-[#5c1030] p-5 sm:p-6 text-white">
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl shadow-lg">
              <Image src="/images/creators/podcast-deje-la-pendejada.jpg" alt="Podcast Deje la Pendejada" fill sizes="160px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col items-center sm:items-start gap-3 text-center sm:text-left">
              <p className="font-serif text-4xl uppercase leading-none">Deje la Pendejada</p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Con Kat y Shei</p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="https://www.youtube.com/@katyshei/podcasts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5c1030]"
                >
                  ▶ YouTube
                </a>
                <a
                  href="https://open.spotify.com/show/4VyjQArqu6NvuF5LOB6R2V"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/60 px-5 py-2.5 text-sm font-semibold"
                >
                  Spotify
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CIERRE ------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2b0f1d] via-[#5c1030] to-[#8a1f4f] px-6 py-20 text-center text-white">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
          <p className="font-serif text-3xl sm:text-5xl leading-tight">
            Tu historia no cambia cuando lo deseas. Cambia cuando decides actuar.
          </p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-gold-light">PODEROSAS 2026–2027 · Primera generación</p>
          {launch ? (
            <p className="flex items-baseline gap-3">
              <span className="text-white/55 line-through">{cop(REGULAR_PRICE_CENTS)}</span>
              <span className="font-serif text-4xl">{cop(LAUNCH_PRICE_CENTS)} COP</span>
            </p>
          ) : (
            <p className="font-serif text-4xl">{cop(REGULAR_PRICE_CENTS)} COP</p>
          )}
          <Button href={CHECKOUT} variant="light">
            Quiero ser parte de PODEROSAS
          </Button>
        </div>
      </section>
    </div>
  );
}
