import type { Metadata } from "next";
import Link from "next/link";
import { nextInstallment, planByToken } from "@/lib/installments/plans";
import { accessUntilAfter, dueDate, formatCopCents, formatDateCo, pauseDate } from "@/lib/installments/schedule";
import { PayInstallmentButton } from "./PayInstallmentButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tus cuotas | PODEROSAS", robots: { index: false, follow: false } };

function nowMs() {
  return Date.now();
}

// Página privada del plan de cuotas (el link llega por correo). Muestra
// solo el primer nombre, el calendario y el botón para pagar la siguiente.
export default async function CuotasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await planByToken(token);

  if (!plan || plan.installments_paid === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-beige-light px-6 py-24 text-center">
        <h1 className="font-serif text-2xl">No encontramos este plan de cuotas</h1>
        <p className="text-sm text-foreground/60">Revisa el link de tu correo o escríbenos por WhatsApp al +57 314 508 9821.</p>
        <Link href="/" className="text-gold hover:underline">← Volver a PODEROSAS</Link>
      </div>
    );
  }

  const start = new Date(plan.access_start!);
  const next = nextInstallment(plan);
  const firstName = (plan.buyer_name ?? "").trim().split(/\s+/)[0];
  const paused = next ? nowMs() > pauseDate(plan.schedule, start, next.number).getTime() : false;
  const accessUntil = accessUntilAfter(plan.schedule, start, plan.installments_paid);

  return (
    <div className="flex flex-1 flex-col items-center bg-beige-light px-4 py-16">
      <div className="w-full max-w-lg flex flex-col gap-6 rounded-3xl border border-gold-light/60 bg-white p-6 sm:p-10">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gold">Metodología PODEROSAS · pago en cuotas</p>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl">{firstName ? `Hola, ${firstName}` : "Tu plan de cuotas"}</h1>
        </div>

        {next ? (
          paused ? (
            <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
              <strong>Recuerda pagar tu cuota para habilitar el siguiente nivel.</strong> Tu acceso está en pausa hasta que se pague la
              cuota {next.number} de {plan.installments_total}. Apenas la pagues, vuelve todo tu contenido.
            </p>
          ) : (
            <p className="rounded-2xl bg-beige-light p-4 text-sm text-foreground/80">
              Tienes acceso hasta el <strong>{formatDateCo(accessUntil)}</strong>. Tu próxima cuota vence el{" "}
              <strong>{next.dueAt ? formatDateCo(next.dueAt) : "—"}</strong>.
            </p>
          )
        ) : (
          <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <strong>¡Pagaste todas tus cuotas!</strong> Tu acceso completo va hasta el {formatDateCo(accessUntil)}.
          </p>
        )}

        <ol className="flex flex-col divide-y divide-gold-light/50 rounded-2xl border border-gold-light/60">
          {plan.schedule.installments.map((step, i) => {
            const n = i + 1;
            const paid = n <= plan.installments_paid;
            const due = dueDate(plan.schedule, start, n);
            return (
              <li key={n} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">Cuota {n} · {formatCopCents(step.amountCents)}</p>
                  <p className="text-xs text-foreground/55">
                    {n === 1 ? "Al inscribirte" : `Vence el ${formatDateCo(due)}`} · habilita hasta el mes {step.unlocksThroughMonth}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {paid ? "Pagada" : "Pendiente"}
                </span>
              </li>
            );
          })}
        </ol>

        {next && <PayInstallmentButton token={token} label={`Pagar cuota ${next.number} · ${formatCopCents(next.amountCents)}`} />}

        <p className="text-center text-xs text-foreground/50">
          Total del plan: {formatCopCents(plan.total_cents)} COP. ¿Dudas? WhatsApp +57 314 508 9821.
        </p>
      </div>
    </div>
  );
}
