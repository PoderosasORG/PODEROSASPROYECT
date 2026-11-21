type FileItem = { id: string; name: string };

const LAUNCH_TOPICS = [
  "Marca personal",
  "Relaciones de pareja",
  "Productividad",
  "Organización del tiempo",
  "Energía y magnetismo",
  "Hábitos",
  "Autoestima",
  "Liderazgo",
];

const BONUSES: { title: string; fileMatch?: string }[] = [
  // 3 bonos (acordado con Kat el 2026-11-20).
  { title: "Masterclass: Marca Personal, Monetización y Comunidad en Redes Sociales" },
  { title: "Ebook: 50 Acuerdos de Pareja para Construir Relaciones Sanas", fileMatch: "50 acuerdos" },
  { title: "Reto de 7 Días para Enfocarte en Ti y Fortalecer tu Amor Propio" },
];

export function AccessOverview({
  isLaunchBuyer,
  bonusFiles,
  whatsappInviteUrl,
}: {
  isLaunchBuyer: boolean;
  bonusFiles: FileItem[];
  whatsappInviteUrl?: string | null;
}) {
  const findFile = (match?: string) =>
    match ? bonusFiles.find((f) => f.name.toLowerCase().includes(match.toLowerCase())) : undefined;

  return (
    <div className="bg-white border-b border-gold-light/30 px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <h2 className="font-serif text-xl mb-1">Tu acceso incluye</h2>
          <p className="text-xs text-foreground/50">
            Aquí vas a ver todo lo que vas a recibir durante tus 6 meses — lo que ya está disponible y lo
            que todavía está en camino.
          </p>
        </div>

        {/* Clases en vivo — quienes compraron antes del cierre del
            lanzamiento (sábado 21 de nov., 11:59 p.m.) reciben las 8
            clases por separado, una por tema; después del cierre, el
            beneficio son 6 clases en vivo (la agrupación específica de
            esas 6 todavía no está definida — pendiente de Shei). */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gold font-medium mb-3">
            {isLaunchBuyer ? "Tus 8 clases en vivo" : "Tus 6 clases en vivo"}
          </p>
          {isLaunchBuyer ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LAUNCH_TOPICS.map((topic, i) => (
                <div
                  key={topic}
                  className="rounded-xl border border-gold-light/50 bg-beige-light/50 p-3 flex flex-col gap-1"
                >
                  <span className="text-[10px] text-gold font-medium">Clase {i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{topic}</span>
                  <span className="text-[11px] text-foreground/50">
                    Fecha por confirmar — te avisamos por la comunidad de WhatsApp.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60">
              Fechas por confirmar — te avisamos por la comunidad de WhatsApp apenas estén programadas.
            </p>
          )}
        </div>

        {/* Bonos de lanzamiento */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gold font-medium mb-3">
            Tus 3 bonos de lanzamiento
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BONUSES.map((bonus, i) => {
              const file = findFile(bonus.fileMatch);
              return (
                <div
                  key={bonus.title}
                  className="rounded-xl border border-gold-light/50 p-4 flex flex-col gap-2"
                >
                  <span className="text-[10px] text-gold font-medium">BONO {i + 1}</span>
                  <span className="text-sm text-foreground">{bonus.title}</span>
                  {file ? (
                    <a
                      href={`/api/mis-compras/files/${file.id}/download`}
                      className="self-start text-xs font-medium text-gold hover:underline"
                    >
                      ✓ Descargar
                    </a>
                  ) : (
                    <span className="text-[11px] text-foreground/50">
                      Próximamente — te avisamos cuando esté listo.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Comunidad de WhatsApp */}
        <div className="rounded-xl border border-gold-light/50 bg-beige-light/50 p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-gold font-medium">
            Comunidad de WhatsApp — Amigas PODEROSAS
          </p>
          {whatsappInviteUrl ? (
            <a
              href={whatsappInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start rounded-full bg-gold px-5 py-2 text-white text-xs font-medium hover:bg-gold-light hover:text-foreground transition-colors"
            >
              Unirme a la comunidad
            </a>
          ) : (
            <p className="text-sm text-foreground/60">
              Te vamos a agregar pronto — espera nuestro mensaje.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
