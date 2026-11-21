import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GA_MEASUREMENT_ID } from "./config";

// Conversiones enviadas desde el servidor (GA4 Measurement Protocol y Meta
// Conversions API). Reglas:
//  - La compra se envía SOLO cuando Wompi confirma el pago (webhook).
//  - Una sola vez por pedido y plataforma (tabla analytics_sent).
//  - Sin datos personales: ni nombre, ni correo, ni teléfono, ni ciudad.
//    Solo el id del pedido, el valor y los identificadores anónimos de
//    las cookies de GA/Meta.

const TIMEOUT_MS = 4000;

function cleanId(value: string | undefined, max = 200) {
  if (!value) return null;
  const v = value.replace(/[^\w.\-]/g, "").slice(0, max);
  return v || null;
}

/** "_ga" = GA1.1.123456.789012 → client_id "123456.789012". */
function gaClientId(raw: string | undefined) {
  const parts = cleanId(raw)?.split(".") ?? [];
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
}

/** Guarda en el pedido los identificadores anónimos de las cookies. */
export async function saveAnalyticsIds(req: NextRequest, orderId: string) {
  const ids = {
    ga_client_id: gaClientId(req.cookies.get("_ga")?.value),
    meta_fbp: cleanId(req.cookies.get("_fbp")?.value),
    meta_fbc: cleanId(req.cookies.get("_fbc")?.value),
  };
  if (!ids.ga_client_id && !ids.meta_fbp && !ids.meta_fbc) return;
  try {
    const { error } = await createAdminClient().from("orders").update(ids).eq("id", orderId);
    if (error) console.error("[medicion] no se guardaron los ids anónimos:", error.message);
  } catch (err) {
    console.error("[medicion] no se guardaron los ids anónimos:", err);
  }
}

/** Reserva el envío. false = ya se envió (o no se puede garantizar que no). */
async function claim(key: string) {
  const { error } = await createAdminClient().from("analytics_sent").insert({ dedupe_key: key });
  return !error;
}

async function release(key: string) {
  await createAdminClient().from("analytics_sent").delete().eq("dedupe_key", key);
}

type PaymentInfo = {
  orderId: string;
  productId: string;
  productTitle: string;
  amountCents: number;
  currency: string;
  siteUrl: string;
};

async function loadIds(orderId: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select("ga_client_id, meta_fbp, meta_fbc")
    .eq("id", orderId)
    .maybeSingle();
  return data as { ga_client_id: string | null; meta_fbp: string | null; meta_fbc: string | null } | null;
}

async function sendGa4(eventName: string, key: string, clientId: string, params: Record<string, unknown>) {
  const secret = process.env.GA_API_SECRET;
  if (!secret) return;
  if (!(await claim(key))) return;
  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, events: [{ name: eventName, params: { ...params, engagement_time_msec: 1 } }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GA4 respondió ${res.status}`);
  } catch (err) {
    await release(key);
    console.error(`[medicion] GA4 ${eventName} no se envió:`, err);
  }
}

async function sendMetaPurchase(p: PaymentInfo, fbp: string | null, fbc: string | null) {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  // Sin _fbp no hubo consentimiento de publicidad (el Pixel no cargó): no se envía.
  if (!pixel || !token || !fbp) return;
  const key = `meta:purchase:${p.orderId}`;
  if (!(await claim(key))) return;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: p.orderId,
            action_source: "website",
            event_source_url: `${p.siteUrl}/cursos/metodologia-poderosa`,
            user_data: { fbp, ...(fbc ? { fbc } : {}) },
            custom_data: { currency: p.currency, value: p.amountCents / 100, content_ids: [p.productId], content_type: "product" },
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Meta respondió ${res.status}`);
  } catch (err) {
    await release(key);
    console.error("[medicion] Meta Purchase no se envió:", err);
  }
}

/** Pago aprobado (llamar SOLO con el pago confirmado por Wompi). */
export async function trackPurchase(p: PaymentInfo) {
  try {
    const ids = await loadIds(p.orderId).catch(() => null);
    const value = p.amountCents / 100;
    await Promise.all([
      sendGa4("purchase", `ga4:purchase:${p.orderId}`, ids?.ga_client_id || `srv.${p.orderId}`, {
        transaction_id: p.orderId,
        currency: p.currency,
        value,
        items: [{ item_id: p.productId, item_name: p.productTitle, price: value, quantity: 1 }],
      }),
      sendMetaPurchase(p, ids?.meta_fbp ?? null, ids?.meta_fbc ?? null),
    ]);
  } catch (err) {
    console.error("[medicion] trackPurchase:", err);
  }
}

/** Pago rechazado (solo GA4, como evento propio; nunca a Meta). */
export async function trackDeclined(p: PaymentInfo & { transactionId: string; status: string }) {
  try {
    const ids = await loadIds(p.orderId).catch(() => null);
    await sendGa4("payment_declined", `ga4:declined:${p.transactionId}`, ids?.ga_client_id || `srv.${p.orderId}`, {
      currency: p.currency,
      value: p.amountCents / 100,
      payment_status: p.status,
      item_id: p.productId,
    });
  } catch (err) {
    console.error("[medicion] trackDeclined:", err);
  }
}
