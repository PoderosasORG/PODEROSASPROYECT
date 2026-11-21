import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, isAdminRequest, pesos } from "@/lib/admin/csv";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: expenses }, { data: subs }, { data: events }] = await Promise.all([
    admin.from("admin_expenses").select("*").order("expense_date"),
    admin.from("admin_subscriptions").select("id, service"),
    admin.from("products").select("id, title").eq("type", "event"),
  ]);
  const subName = new Map((subs ?? []).map((s) => [s.id, s.service]));
  const eventName = new Map((events ?? []).map((e) => [e.id, e.title]));

  return csvResponse(
    `gastos-poderosas-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Fecha", "Concepto", "Categoría", "Valor COP", "Valor original", "Moneda", "Quién pagó", "Medio", "Últimos 4", "Evento", "Suscripción", "Factura", "Notas"],
    (expenses ?? []).map((e) => [
      e.expense_date,
      e.concept,
      e.category,
      pesos(e.amount_cop_cents),
      Number(e.amount_cents) / 100,
      e.currency,
      e.paid_by,
      e.card_label,
      e.card_last4,
      e.event_product_id ? eventName.get(e.event_product_id) : "",
      e.subscription_id ? subName.get(e.subscription_id) : "",
      e.invoice_name ?? (e.invoice_path ? "Sí" : "No"),
      e.notes,
    ]),
  );
}
