import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstallmentPlan } from "@/lib/installments/plans";
import { nextInstallment } from "@/lib/installments/plans";
import { formatCopCents, formatDateCo, pauseDate } from "@/lib/installments/schedule";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; style: string }> = {
  pendiente: { label: "Sin primer pago", style: "bg-slate-100 text-slate-700" },
  al_dia: { label: "Al día", style: "bg-emerald-100 text-emerald-800" },
  en_mora: { label: "En pausa", style: "bg-rose-100 text-rose-700" },
  completado: { label: "Completado", style: "bg-sky-100 text-sky-800" },
  cancelado: { label: "Cancelado", style: "bg-slate-100 text-slate-500" },
};

function nowMs() {
  return Date.now();
}

export default async function CuotasAdminPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireAdmin();
  const { ver } = await searchParams;
  const showAll = ver === "todos";
  const admin = createAdminClient();

  let query = admin.from("installment_plans").select("*").order("created_at", { ascending: false }).limit(500);
  if (!showAll) query = query.gt("installments_paid", 0);
  const { data, error } = await query;
  const plans = (data ?? []) as InstallmentPlan[];
  const now = nowMs();

  const active = plans.filter((p) => p.status === "al_dia" || p.status === "en_mora");
  const pendingCents = active.reduce((sum, p) => {
    const paid = p.schedule.installments.slice(0, p.installments_paid).reduce((s, i) => s + i.amountCents, 0);
    return sum + (p.total_cents - paid);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl">Pago en cuotas</h1>
        <p className="text-sm text-foreground/60">
          Cada cuota pagada habilita su tramo del acceso. Si no pagan, el acceso se pausa solo y les llegan los avisos por correo.
          El calendario se cambia en <code>src/lib/installments/config.ts</code> (solo afecta planes nuevos).
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {error.message}. Si dice que no existe la tabla, falta correr el SQL de cuotas en Supabase.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Planes activos", value: active.length },
          { label: "En pausa", value: plans.filter((p) => p.status === "en_mora").length },
          { label: "Completados", value: plans.filter((p) => p.status === "completado").length },
          { label: "Por cobrar", value: formatCopCents(pendingCents) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gold-light/60 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-sm">
        <Link href="/admin/cuotas" className={`rounded-full border px-3 py-1.5 ${!showAll ? "bg-gold text-white border-gold" : "bg-white border-gold-light/70"}`}>
          Con al menos un pago
        </Link>
        <Link href="/admin/cuotas?ver=todos" className={`rounded-full border px-3 py-1.5 ${showAll ? "bg-gold text-white border-gold" : "bg-white border-gold-light/70"}`}>
          Todos (incluye checkouts sin pagar)
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold-light/60 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-foreground/50">
            <tr>
              <th className="p-3">Alumna</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Pagadas</th>
              <th className="p-3">Próxima cuota</th>
              <th className="p-3">Se pausa</th>
              <th className="p-3">Link de pago</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const next = nextInstallment(p);
              const pause = next && p.access_start ? pauseDate(p.schedule, new Date(p.access_start), next.number) : null;
              const st = STATUS[p.status] ?? STATUS.pendiente;
              return (
                <tr key={p.id} className="border-t border-gold-light/40 align-top">
                  <td className="p-3">
                    <p className="font-medium">{p.buyer_name || "—"}</p>
                    <p className="text-xs text-foreground/55">{p.buyer_email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${st.style}`}>{st.label}</span>
                  </td>
                  <td className="p-3">
                    {p.installments_paid} de {p.installments_total}
                  </td>
                  <td className="p-3">
                    {next && next.dueAt ? (
                      <>
                        <p>
                          Cuota {next.number} · {formatCopCents(next.amountCents)}
                        </p>
                        <p className={`text-xs ${next.dueAt.getTime() < now ? "text-rose-700" : "text-foreground/55"}`}>
                          Vence el {formatDateCo(next.dueAt)}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-xs text-foreground/70">{pause ? formatDateCo(pause) : "—"}</td>
                  <td className="p-3">
                    {p.installments_paid > 0 && next ? (
                      <span className="select-all break-all font-mono text-[11px] text-foreground/70">
                        https://poderosas.org/cuotas/{p.pay_token}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-foreground/50">
                  Todavía no hay planes de cuotas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
