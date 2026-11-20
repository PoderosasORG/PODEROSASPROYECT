import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRenewalReminderEmail } from "@/lib/sendRenewalReminderEmail";

// Corre una vez al día (ver vercel.json). Revisa accesos con vencimiento
// (ej. Metodología PODEROSAS, 6 meses) y manda: un aviso 7 días antes de
// vencerse, y otro el día en que ya se venció — cada uno una sola vez
// por orden, controlado por las columnas renewal_reminder_*_sent_at.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, buyer_name, buyer_email, access_expires_at, renewal_reminder_7d_sent_at, renewal_reminder_expiry_sent_at, products(title, type)",
    )
    .eq("status", "approved")
    .not("access_expires_at", "is", null)
    .lte("access_expires_at", in7Days.toISOString());

  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, sent7d: 0, sentExpiry: 0, failed: [] });
  }

  const failed: { email: string; error: string }[] = [];
  let sent7d = 0;
  let sentExpiry = 0;

  for (const order of orders) {
    const product = Array.isArray(order.products) ? order.products[0] : order.products;
    if (!order.buyer_email || !order.access_expires_at || !product) continue;

    const expiresAt = new Date(order.access_expires_at);
    const renewUrl = `${req.nextUrl.origin}/cursos/metodologia-poderosa`;
    const alreadyExpired = expiresAt.getTime() <= now.getTime();

    try {
      if (alreadyExpired && !order.renewal_reminder_expiry_sent_at) {
        await sendRenewalReminderEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          productTitle: product.title,
          renewUrl,
          variant: "expiry",
        });
        await admin
          .from("orders")
          .update({ renewal_reminder_expiry_sent_at: now.toISOString() })
          .eq("id", order.id);
        sentExpiry++;
      } else if (!alreadyExpired && !order.renewal_reminder_7d_sent_at) {
        await sendRenewalReminderEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          productTitle: product.title,
          renewUrl,
          variant: "7d",
        });
        await admin
          .from("orders")
          .update({ renewal_reminder_7d_sent_at: now.toISOString() })
          .eq("id", order.id);
        sent7d++;
      }
    } catch (err) {
      failed.push({ email: order.buyer_email, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, sent7d, sentExpiry, failed });
}
