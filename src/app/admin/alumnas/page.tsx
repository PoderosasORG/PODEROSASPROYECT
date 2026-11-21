import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/admin/format";
import { METODOLOGIA_PODEROSAS_PRODUCT_ID } from "@/lib/metodologiaPoderosasLanzamiento";
import { formatSessionDate } from "@/lib/welcome/courseInfo";
import { addSession, deleteSession, saveAttendance, setModuleDate } from "./actions";

export const dynamic = "force-dynamic";

const STEPS = [
  { key: "purchase_confirmed_at", label: "Compra confirmada" },
  { key: "account_activated_at", label: "Cuenta activada" },
  { key: "first_login_at", label: "Primer ingreso" },
  { key: "first_module_started_at", label: "Primer módulo iniciado" },
  { key: "first_activity_completed_at", label: "Primera actividad completada" },
] as const;

const input = "rounded-lg border border-gold-light/70 bg-white px-3 py-1.5 text-sm";

export default async function AdminAlumnasPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const pid = METODOLOGIA_PODEROSAS_PRODUCT_ID;

  const [{ data: students }, { data: sessions }, { data: attendance }, { data: prefs }, { data: categories }, { data: emails }] =
    await Promise.all([
      admin.from("student_journey").select("*").eq("product_id", pid).order("purchase_confirmed_at", { ascending: false }),
      admin.from("live_sessions").select("*").eq("product_id", pid).order("starts_at"),
      admin.from("live_session_attendance").select("session_id, email"),
      admin.from("communication_preferences").select("email, marketing_opt_in"),
      admin.from("course_categories").select("id, title, order_index").eq("product_id", pid).order("order_index"),
      admin.from("email_log").select("email, kind, status").eq("kind", "bienvenida_metodologia"),
    ]);
  const catIds = (categories ?? []).map((c) => c.id);
  const { data: modules } = catIds.length
    ? await admin
        .from("category_modules")
        .select("id, title, category_id, is_published, planned_publish_date, order_index")
        .in("category_id", catIds)
        .order("order_index")
    : { data: [] as { id: string; title: string; category_id: string; is_published: boolean; planned_publish_date: string | null }[] };

  const attendedBy = new Map<string, number>();
  for (const a of attendance ?? []) attendedBy.set(a.email, (attendedBy.get(a.email) ?? 0) + 1);
  const attendanceSet = new Set((attendance ?? []).map((a) => `${a.session_id}|${a.email}`));
  const marketing = new Map((prefs ?? []).map((p) => [p.email, p.marketing_opt_in]));
  const welcomed = new Map((emails ?? []).map((e) => [e.email, e.status]));
  const catTitle = new Map((categories ?? []).map((c) => [c.id, c.title]));
  const list = students ?? [];
  const funnel = STEPS.map((s) => ({ ...s, n: list.filter((x) => x[s.key]).length }));
  const participants = list.filter((s) => (attendedBy.get(s.email) ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl">Alumnas de la Metodología</h1>
        <p className="text-sm text-foreground/60">Estados del flujo de bienvenida, encuentros grupales y calendario de módulos.</p>
      </div>

      {/* Embudo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...funnel, { key: "p", label: "Participó en encuentros", n: participants }].map((f) => (
          <div key={f.key} className="rounded-2xl border border-gold-light/60 bg-white p-4">
            <p className="font-serif text-3xl">{f.n}</p>
            <p className="text-[11px] uppercase tracking-wide text-foreground/50">{f.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de alumnas */}
      <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="text-left text-xs text-foreground/50">
            <tr>
              <th className="px-4 py-2">Alumna</th>
              {STEPS.map((s) => (
                <th key={s.key} className="px-3 py-2">{s.label}</th>
              ))}
              <th className="px-3 py-2">Encuentros</th>
              <th className="px-3 py-2">Bienvenida</th>
              <th className="px-4 py-2">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.email} className="border-t border-gold-light/40">
                <td className="px-4 py-2">
                  <span className="font-medium">{s.full_name ?? "—"}</span>
                  <span className="block text-xs text-foreground/50">{s.email}</span>
                </td>
                {STEPS.map((st) => (
                  <td key={st.key} className="px-3 py-2 whitespace-nowrap">
                    {s[st.key] ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">✓ {formatDate(s[st.key])}</span>
                    ) : (
                      <span className="text-[11px] text-foreground/35">Pendiente</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2">{attendedBy.get(s.email) ?? 0}</td>
                <td className="px-3 py-2 text-xs">
                  {welcomed.get(s.email) === "enviado" ? "Enviada" : welcomed.get(s.email) ? "Enviando" : "Antes del flujo"}
                </td>
                <td className="px-4 py-2 text-xs">{marketing.get(s.email) ? "Acepta" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 ? <p className="p-5 text-sm text-foreground/60">Aún no hay alumnas registradas.</p> : null}
      </div>

      {/* Encuentros grupales */}
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Encuentros grupales</h2>
        <form action={addSession} className="flex flex-wrap items-end gap-3 rounded-2xl border border-gold-light/60 bg-white p-4">
          <label className="flex flex-col gap-1 text-xs text-foreground/60">Título
            <input name="title" required className={input} placeholder="Clase en vivo: Autoestima" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-foreground/60">Fecha
            <input type="date" name="date" required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-foreground/60">Hora (Colombia)
            <input type="time" name="time" defaultValue="19:00" className={input} />
          </label>
          <button className="rounded-full bg-gold px-5 py-2 text-sm text-white">Agregar al calendario</button>
        </form>
        {(sessions ?? []).map((ses) => (
          <details key={ses.id} className="rounded-2xl border border-gold-light/60 bg-white p-4">
            <summary className="cursor-pointer">
              <span className="font-medium">{ses.title}</span>
              <span className="text-sm text-foreground/55"> · {formatSessionDate(ses.starts_at)}</span>
            </summary>
            <form action={saveAttendance} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="session_id" value={ses.id} />
              <p className="text-xs text-foreground/55">Marca quiénes asistieron:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                {list.map((s) => (
                  <label key={s.email} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="email" value={s.email} defaultChecked={attendanceSet.has(`${ses.id}|${s.email}`)} />
                    {s.full_name ?? s.email}
                  </label>
                ))}
              </div>
              <button className="self-start rounded-full bg-foreground px-4 py-1.5 text-xs text-white">Guardar asistencia</button>
            </form>
            <form action={deleteSession} className="mt-2">
              <input type="hidden" name="id" value={ses.id} />
              <button className="text-xs text-rose-700 hover:underline">Eliminar encuentro</button>
            </form>
          </details>
        ))}
      </section>

      {/* Calendario de módulos */}
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Calendario de publicación de módulos</h2>
        <p className="text-sm text-foreground/60">
          La fecha de los módulos que aún no están publicados aparece en el panel de las alumnas y en su correo de bienvenida.
        </p>
        <div className="rounded-2xl border border-gold-light/60 bg-white divide-y divide-gold-light/40">
          {(modules ?? []).map((m) => (
            <form key={m.id} action={setModuleDate} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
              <input type="hidden" name="id" value={m.id} />
              <span>
                {m.title}
                <span className="block text-[11px] text-foreground/45">{catTitle.get(m.category_id)}</span>
              </span>
              {m.is_published ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800">Publicado</span>
              ) : (
                <span className="flex items-center gap-2">
                  <input type="date" name="date" defaultValue={m.planned_publish_date ?? ""} className={input} />
                  <button className="rounded-full border border-gold px-3 py-1 text-xs text-gold">Guardar</button>
                </span>
              )}
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
