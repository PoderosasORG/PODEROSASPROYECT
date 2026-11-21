import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/admin/format";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";
import { LEAD_STATUSES, normalizePhone } from "@/lib/sales/leads";
import { WA_TEMPLATES } from "@/lib/sales/templates";
import { openWhatsApp, saveLead } from "./actions";

export const dynamic = "force-dynamic";

// Un pedido sin pagar por más de 2 horas cuenta como checkout abandonado.
const ABANDON_MS = 2 * 60 * 60 * 1000;

// Hora actual fuera del componente (las páginas del panel son dinámicas).
function sinceIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
function olderThan(iso: string, ms: number) {
  return Date.now() - new Date(iso).getTime() > ms;
}

type Contact = {
  key: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  source: string;
  stage: string; // estado mostrado
  auto: boolean; // estado calculado por los pedidos (no editable)
  abandoned: boolean;
  consent: boolean;
  consentSource: string | null;
  notes: string | null;
  assigned: string | null;
  question: string | null;
  lastContact: string | null;
  lastActivity: string;
};

const STATUS_LABEL = new Map<string, string>(LEAD_STATUSES.map((s) => [s.key, s.label]));
const STATUS_STYLE: Record<string, string> = {
  nuevo: "bg-slate-100 text-slate-700",
  interesada: "bg-sky-100 text-sky-800",
  solicito_info: "bg-violet-100 text-violet-800",
  checkout: "bg-amber-100 text-amber-800",
  pago_pendiente: "bg-orange-100 text-orange-800",
  compra: "bg-emerald-100 text-emerald-800",
  no_interesada: "bg-rose-100 text-rose-700",
};
const SOURCE_LABEL: Record<string, string> = {
  orientacion_web: "Pidió orientación",
  checkout: "Checkout",
  masterclass: "Asistió a la masterclass",
  manual: "Agregado a mano",
};

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; wa?: string; dias?: string }>;
}) {
  await requireAdmin();
  const { etapa, wa, dias } = await searchParams;
  const days = Math.min(Math.max(Number(dias) || 30, 1), 365);
  const since = sinceIso(days);
  const admin = createAdminClient();

  const [{ data: visits }, { data: orders }, { data: leads }, { data: events }, { data: log }] = await Promise.all([
    admin.from("landing_visits").select("page, visits, last_seen").gte("last_seen", since),
    admin
      .from("orders")
      .select("id, product_id, buyer_email, buyer_name, buyer_phone, status, wompi_transaction_id, created_at, amount_cents")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    admin.from("sales_leads").select("*"),
    admin.from("products").select("id").eq("type", "event"),
    admin.from("sales_contact_log").select("lead_key, template, contacted_by, created_at").order("created_at", { ascending: false }).limit(300),
  ]);

  const eventIds = new Set((events ?? []).map((e) => e.id));
  const isTest = (o: { wompi_transaction_id: string | null }) => (o.wompi_transaction_id ?? "").startsWith("PRUEBA");
  const metOrders = (orders ?? []).filter((o) => o.product_id === METODOLOGIA_PODEROSAS_PRODUCT_ID && !isTest(o));

  // ---- Contactos: pedidos de la Metodología + asistentes del evento + contactos guardados.
  const contacts = new Map<string, Contact>();
  const keyOf = (email?: string | null, phone?: string | null) =>
    email ? email.toLowerCase() : phone ? (normalizePhone(phone) ?? phone) : null;
  const base = (key: string, email: string | null, phone: string | null, name: string | null, source: string, at: string): Contact => ({
    key, email, phone, name, source, stage: "nuevo", auto: false, abandoned: false, consent: false, consentSource: null,
    notes: null, assigned: null, question: null, lastContact: null, lastActivity: at,
  });

  // Asistentes del evento presencial (para el agradecimiento).
  for (const o of orders ?? []) {
    if (!eventIds.has(o.product_id) || o.status !== "approved") continue;
    const k = keyOf(o.buyer_email, o.buyer_phone);
    if (k && !contacts.has(k)) contacts.set(k, base(k, o.buyer_email?.toLowerCase() ?? null, normalizePhone(o.buyer_phone), o.buyer_name, "masterclass", o.created_at));
  }

  // Estado automático según los pedidos de la Metodología (más fuerte gana).
  const rank = ["nuevo", "interesada", "solicito_info", "checkout", "pago_pendiente", "compra"];
  for (const o of [...metOrders].reverse()) {
    const k = keyOf(o.buyer_email, o.buyer_phone);
    if (!k) continue;
    const c = contacts.get(k) ?? base(k, o.buyer_email?.toLowerCase() ?? null, normalizePhone(o.buyer_phone), o.buyer_name, "checkout", o.created_at);
    const stage = o.status === "approved" ? "compra" : o.status === "pending" ? (o.wompi_transaction_id ? "pago_pendiente" : "checkout") : null;
    if (stage && rank.indexOf(stage) >= rank.indexOf(c.auto ? c.stage : "nuevo")) {
      c.stage = stage;
      c.auto = true;
      c.abandoned = stage === "checkout" && olderThan(o.created_at, ABANDON_MS);
    }
    c.name = c.name ?? o.buyer_name;
    c.phone = c.phone ?? normalizePhone(o.buyer_phone);
    if (o.created_at > c.lastActivity) c.lastActivity = o.created_at;
    contacts.set(k, c);
  }

  // Contactos guardados: estado manual (si no hay uno automático más fuerte), autorización y notas.
  for (const l of leads ?? []) {
    const k = keyOf(l.email, l.phone);
    if (!k) continue;
    const c = contacts.get(k) ?? base(k, l.email, l.phone, l.full_name, l.source ?? "manual", l.created_at);
    // Regla: una compra siempre manda. "No interesada" (marcado a mano)
    // gana sobre todo lo demás. Si no hay pedidos, vale el estado manual.
    if (c.stage !== "compra") {
      if (l.status === "no_interesada") {
        c.stage = "no_interesada";
        c.auto = false;
      } else if (!c.auto) {
        c.stage = l.status;
      }
    }
    Object.assign(c, {
      phone: c.phone ?? l.phone,
      name: c.name ?? l.full_name,
      consent: l.whatsapp_consent,
      consentSource: l.consent_source,
      notes: l.notes,
      assigned: l.assigned_to,
      question: l.question,
      lastContact: l.last_contact_at,
      source: l.source === "orientacion_web" ? "orientacion_web" : c.source,
    });
    if (l.updated_at > c.lastActivity) c.lastActivity = l.updated_at;
    contacts.set(k, c);
  }

  const all = [...contacts.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  const list = etapa === "abandonado" ? all.filter((c) => c.abandoned) : etapa ? all.filter((c) => c.stage === etapa) : all;
  const logByKey = new Map<string, { template: string; by: string; at: string }[]>();
  for (const e of log ?? []) {
    logByKey.set(e.lead_key, [...(logByKey.get(e.lead_key) ?? []), { template: e.template, by: e.contacted_by, at: e.created_at }]);
  }
  const tplLabel = new Map(WA_TEMPLATES.map((t) => [t.key, t.label]));

  // ---- Embudo.
  const landing = (visits ?? []).filter((v) => v.page === "metodologia");
  const funnel = [
    { label: "Visitaron la landing", value: landing.length, hint: `${landing.reduce((s, v) => s + v.visits, 0)} visitas en total · anónimo` },
    { label: "Iniciaron el checkout", value: all.filter((c) => c.auto || c.stage === "checkout").length },
    { label: "Abandonaron el checkout", value: all.filter((c) => c.abandoned).length, filter: "abandonado" },
    { label: "Pago pendiente", value: all.filter((c) => c.stage === "pago_pendiente").length, filter: "pago_pendiente" },
    { label: "Compraron", value: all.filter((c) => c.stage === "compra").length, filter: "compra" },
    { label: "Pidieron orientación", value: (leads ?? []).filter((l) => l.source === "orientacion_web").length, filter: "solicito_info" },
  ];

  const input = "rounded-lg border border-gold-light/70 bg-white px-2 py-1 text-xs";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Seguimiento comercial</h1>
          <p className="text-sm text-foreground/60">
            Lanzamiento de la Metodología PODEROSAS · últimos {days} días. Solo se puede escribir por WhatsApp a quien dejó
            su número y autorizó que le escribamos; los mensajes los envía una persona del equipo.
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm">
          <select name="dias" defaultValue={String(days)} className="rounded-full border border-gold-light/70 bg-white px-3 py-1.5">
            {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Últimos {d} días</option>)}
          </select>
          <button className="rounded-full bg-foreground px-4 py-1.5 text-white">Ver</button>
        </form>
      </div>

      {wa === "sin-autorizacion" ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Ese contacto no ha autorizado que le escribamos por WhatsApp.</p> : null}
      {wa === "sin-datos" ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Falta el número o la plantilla.</p> : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {funnel.map((f) => (
          <a
            key={f.label}
            href={f.filter ? `/admin/seguimiento?etapa=${f.filter}&dias=${days}` : undefined}
            className="rounded-2xl border border-gold-light/60 bg-white p-4 hover:border-gold"
          >
            <p className="font-serif text-3xl">{f.value}</p>
            <p className="text-[11px] uppercase tracking-wide text-foreground/50">{f.label}</p>
            {f.hint ? <p className="mt-1 text-[10px] text-foreground/40">{f.hint}</p> : null}
          </a>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <a href={`/admin/seguimiento?dias=${days}`} className={`rounded-full border px-3 py-1 ${!etapa ? "border-gold bg-gold text-white" : "border-gold-light/70 bg-white"}`}>
          Todos ({all.length})
        </a>
        {LEAD_STATUSES.map((s) => (
          <a
            key={s.key}
            href={`/admin/seguimiento?etapa=${s.key}&dias=${days}`}
            className={`rounded-full border px-3 py-1 ${etapa === s.key ? "border-gold bg-gold text-white" : "border-gold-light/70 bg-white"}`}
          >
            {s.label} ({all.filter((c) => c.stage === s.key).length})
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {list.map((c) => {
          const canWrite = !!c.phone && c.consent;
          const history = logByKey.get(c.key) ?? [];
          return (
            <details key={c.key} className="rounded-2xl border border-gold-light/60 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-48 font-medium">
                  {c.name ?? "Sin nombre"}
                  <span className="block text-xs font-normal text-foreground/50">{c.email ?? c.phone ?? ""}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${STATUS_STYLE[c.stage] ?? ""}`}>
                  {STATUS_LABEL.get(c.stage)}
                  {c.abandoned ? " · abandonado" : ""}
                </span>
                <span className="text-[11px] text-foreground/50">{SOURCE_LABEL[c.source] ?? c.source}</span>
                <span className={`text-[11px] ${canWrite ? "text-emerald-700" : "text-foreground/40"}`}>
                  {canWrite ? "✓ Autorizó WhatsApp" : c.phone ? "Sin autorización" : "Sin número"}
                </span>
                <span className="ml-auto text-[11px] text-foreground/40">
                  {c.lastContact ? `Último contacto ${formatDate(c.lastContact)}` : "Sin contactar"}
                </span>
              </summary>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-gold-light/40 px-4 py-4">
                <form action={saveLead} className="flex flex-col gap-2 text-xs">
                  <input type="hidden" name="email" value={c.email ?? ""} />
                  <input type="hidden" name="full_name" value={c.name ?? ""} />
                  <input type="hidden" name="source" value={c.source} />
                  {c.question ? <p className="rounded-lg bg-beige-light/60 p-2">Su duda: «{c.question}»</p> : null}
                  <label className="flex items-center gap-2">
                    Estado comercial
                    <select name="status" defaultValue={c.auto ? "" : c.stage} className={input}>
                      <option value="">{c.auto ? `Automático: ${STATUS_LABEL.get(c.stage)}` : "—"}</option>
                      {LEAD_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    Celular
                    <input name="phone" defaultValue={c.phone ?? ""} placeholder="+57 300…" className={input} />
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" name="whatsapp_consent" defaultChecked={c.consent} className="mt-0.5" />
                    <span>
                      Autorizó que le escribamos por WhatsApp
                      {c.consentSource ? <span className="block text-foreground/45">Origen: {c.consentSource}</span> : null}
                    </span>
                  </label>
                  {!c.consent ? (
                    <input name="consent_how" placeholder="¿Cómo autorizó? (ej. nos escribió primero)" className={input} />
                  ) : null}
                  <input name="assigned_to" defaultValue={c.assigned ?? ""} placeholder="Responsable (Kat, Shei, Luz…)" className={input} />
                  <textarea name="notes" defaultValue={c.notes ?? ""} rows={2} placeholder="Notas" className={input} />
                  <button className="self-start rounded-full bg-gold px-4 py-1.5 text-white">Guardar</button>
                </form>

                <div className="flex flex-col gap-2 text-xs">
                  {canWrite ? (
                    <form action={openWhatsApp} target="_blank" className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="email" value={c.email ?? ""} />
                      <input type="hidden" name="phone" value={c.phone ?? ""} />
                      <input type="hidden" name="full_name" value={c.name ?? ""} />
                      <select name="template" className={input}>
                        {WA_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      <button className="rounded-full bg-[#1f8f4e] px-4 py-1.5 text-white">Abrir WhatsApp</button>
                    </form>
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-2 text-foreground/55">
                      No se le puede escribir: {c.phone ? "no ha autorizado mensajes por WhatsApp." : "no dejó su número."}
                    </p>
                  )}
                  <p className="font-medium text-foreground/60">Historial</p>
                  {history.length ? (
                    <ul className="space-y-1">
                      {history.map((h) => (
                        <li key={h.at}>
                          {formatDate(h.at)} · {tplLabel.get(h.template) ?? h.template} · {h.by}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-foreground/40">Todavía no se le ha escrito.</p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
        {list.length === 0 ? <p className="text-sm text-foreground/60">No hay contactos en esta etapa.</p> : null}
      </div>

      <details className="rounded-2xl border border-gold-light/60 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">Ver las plantillas de WhatsApp</summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {WA_TEMPLATES.map((t) => (
            <div key={t.key} className="rounded-xl bg-beige-light/50 p-3">
              <p className="font-medium">{t.label}</p>
              <p className="mt-1 whitespace-pre-line text-xs text-foreground/70">{t.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-foreground/50">
          {"{nombre}"}, {"{link}"} y {"{fecha}"} se completan solos. La fecha es la del cierre real del precio especial.
        </p>
      </details>
    </div>
  );
}
