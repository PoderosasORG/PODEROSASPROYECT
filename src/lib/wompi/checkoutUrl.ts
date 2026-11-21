import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Arma el link al checkout de Wompi con firma de integridad. Lo usan la
// compra normal (/api/checkout) y el pago de cada cuota (/api/cuotas/pagar).
export async function buildWompiCheckoutUrl(params: {
  creatorId: string;
  publicKey: string;
  reference: string;
  amountCents: number;
  currency: string;
  siteOrigin: string;
}): Promise<{ url: string } | { error: string }> {
  const { data: secretRow } = await createAdminClient()
    .from("creator_payment_secrets")
    .select("wompi_integrity_secret")
    .eq("creator_id", params.creatorId)
    .maybeSingle();
  if (!secretRow) return { error: "Falta configurar la llave de integridad de Wompi para esta creadora." };

  const signature = crypto
    .createHash("sha256")
    .update(`${params.reference}${params.amountCents}${params.currency}${secretRow.wompi_integrity_secret}`)
    .digest("hex");

  const query = new URLSearchParams({
    "public-key": params.publicKey,
    currency: params.currency,
    "amount-in-cents": String(params.amountCents),
    reference: params.reference,
    "signature:integrity": signature,
    // Wompi pide dirección, ciudad y teléfono (para el CRM de /admin).
    "collect-shipping": "true",
  });
  // El CDN de Wompi rechaza redirect-url a localhost.
  const isLocal = params.siteOrigin.includes("localhost") || params.siteOrigin.includes("127.0.0.1");
  if (!isLocal) query.set("redirect-url", `${params.siteOrigin}/pago/confirmacion?order=${params.reference}`);

  return { url: `https://checkout.wompi.co/p/?${query.toString()}` };
}
