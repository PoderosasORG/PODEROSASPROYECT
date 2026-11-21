import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstallmentPlan } from "@/lib/installments/plans";
import { nextInstallment } from "@/lib/installments/plans";
import { sendInstallmentEmail } from "@/lib/installments/emails";
import { pauseDate } from "@/lib/installments/schedule";

// Corre una vez al día (ver vercel.json). Para cada plan con cuotas
// pendientes manda, una sola vez por cuota:
//   1) un recordatorio 3 días antes de la fecha límite,
//   2) un aviso el día que vence,
//   3) un aviso cuando el acceso se pausa (pasada la gracia) y marca el
//      plan "en_mora". El bloqueo en sí lo hace el vencimiento del acceso.
const BEFORE_DAYS = 3;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data, error } = await admin
    .from("installment_plans")
    .select("*")
    .in("status", ["al_dia", "en_mora"])
    .not("next_due_at", "is", null);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const sent = { recordatorio: 0, vence_hoy: 0, pausado: 0 };
  const failed: string[] = [];

  for (const plan of (data ?? []) as InstallmentPlan[]) {
    const next = nextInstallment(plan);
    if (!next?.dueAt || !plan.access_start) continue;
    const due = next.dueAt.getTime();
    const pause = pauseDate(plan.schedule, new Date(plan.access_start), next.number);
    const payUrl = `${req.nextUrl.origin}/cuotas/${plan.pay_token}`;
    const base = { nextNumber: next.number, total: plan.installments_total, nextAmountCents: next.amountCents };

    try {
      if (now >= pause.getTime()) {
        if (plan.reminded_paused_n !== next.number) {
          await sendInstallmentEmail({ to: plan.buyer_email, name: plan.buyer_name, payUrl, email: { kind: "pausado", ...base } });
          await admin
            .from("installment_plans")
            .update({ reminded_paused_n: next.number, status: "en_mora", updated_at: new Date().toISOString() })
            .eq("id", plan.id);
          sent.pausado++;
        }
      } else if (now >= due) {
        if (plan.reminded_due_n !== next.number) {
          await sendInstallmentEmail({ to: plan.buyer_email, name: plan.buyer_name, payUrl, email: { kind: "vence_hoy", ...base, pauseOn: pause } });
          await admin.from("installment_plans").update({ reminded_due_n: next.number }).eq("id", plan.id);
          sent.vence_hoy++;
        }
      } else if (now >= due - BEFORE_DAYS * 86_400_000) {
        if (plan.reminded_before_n !== next.number) {
          await sendInstallmentEmail({
            to: plan.buyer_email,
            name: plan.buyer_name,
            payUrl,
            email: { kind: "recordatorio", ...base, nextDue: next.dueAt, pauseOn: pause },
          });
          await admin.from("installment_plans").update({ reminded_before_n: next.number }).eq("id", plan.id);
          sent.recordatorio++;
        }
      }
    } catch (err) {
      failed.push(`${plan.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
