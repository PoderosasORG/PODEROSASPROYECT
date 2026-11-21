import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstallmentConfig } from "./config";
import { accessUntilAfter, dueDate } from "./schedule";

export type InstallmentPlan = {
  id: string;
  product_id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_id: string | null;
  schedule: InstallmentConfig;
  total_cents: number;
  installments_total: number;
  installments_paid: number;
  access_start: string | null;
  next_due_at: string | null;
  status: "pendiente" | "al_dia" | "en_mora" | "completado" | "cancelado";
  pay_token: string;
  reminded_before_n: number | null;
  reminded_due_n: number | null;
  reminded_paused_n: number | null;
  created_at: string;
};

export function newPayToken() {
  return crypto.randomBytes(18).toString("hex");
}

export async function createPlan(params: {
  productId: string;
  email: string;
  name: string | null;
  buyerId: string | null;
  config: InstallmentConfig;
}) {
  const { data, error } = await createAdminClient()
    .from("installment_plans")
    .insert({
      product_id: params.productId,
      buyer_email: params.email.toLowerCase(),
      buyer_name: params.name,
      buyer_id: params.buyerId,
      schedule: params.config,
      total_cents: params.config.totalCents,
      installments_total: params.config.installments.length,
      pay_token: newPayToken(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as InstallmentPlan;
}

export async function planByToken(token: string) {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  const { data } = await createAdminClient().from("installment_plans").select("*").eq("pay_token", token).maybeSingle();
  return (data as InstallmentPlan | null) ?? null;
}

/** Plan con cuotas pendientes de una alumna (por cuenta o correo). */
export async function openPlanFor(productId: string, userId: string, email: string | null) {
  const admin = createAdminClient();
  const filters = [`buyer_id.eq.${userId}`];
  // Comillas: el correo puede traer caracteres que PostgREST interpreta.
  if (email) filters.push(`buyer_email.eq."${email.toLowerCase().replace(/"/g, "")}"`);
  const { data } = await admin
    .from("installment_plans")
    .select("*")
    .eq("product_id", productId)
    .or(filters.join(","))
    .gt("installments_paid", 0)
    .in("status", ["al_dia", "en_mora"])
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as InstallmentPlan | undefined) ?? null;
}

/** Siguiente cuota a pagar (número y valor), o null si ya terminó. */
export function nextInstallment(plan: InstallmentPlan) {
  const n = plan.installments_paid + 1;
  if (n > plan.installments_total || plan.status === "completado" || plan.status === "cancelado") return null;
  const step = plan.schedule.installments[n - 1];
  const due = plan.access_start ? dueDate(plan.schedule, new Date(plan.access_start), n) : null;
  return { number: n, amountCents: step.amountCents, dueAt: due };
}

/**
 * Se llama desde el webhook cuando Wompi aprueba la cuota n. Actualiza el
 * plan y devuelve hasta cuándo queda el acceso. Idempotente: si la cuota
 * ya estaba registrada no la cuenta dos veces.
 */
export async function registerInstallmentPayment(params: { planId: string; number: number; buyerId: string | null }) {
  const admin = createAdminClient();
  const { data } = await admin.from("installment_plans").select("*").eq("id", params.planId).maybeSingle();
  const plan = data as InstallmentPlan | null;
  if (!plan) return null;

  const accessStart = plan.access_start ? new Date(plan.access_start) : new Date();
  const paid = Math.max(plan.installments_paid, params.number);
  const done = paid >= plan.installments_total;
  const accessUntil = accessUntilAfter(plan.schedule, accessStart, params.number);
  const nextDue = done ? null : dueDate(plan.schedule, accessStart, paid + 1);

  const update = {
    access_start: accessStart.toISOString(),
    installments_paid: paid,
    next_due_at: nextDue?.toISOString() ?? null,
    status: done ? "completado" : "al_dia",
    buyer_id: plan.buyer_id ?? params.buyerId,
    updated_at: new Date().toISOString(),
  };
  await admin.from("installment_plans").update(update).eq("id", plan.id);
  return { plan: { ...plan, ...update } as InstallmentPlan, accessUntil, nextDue, done };
}
