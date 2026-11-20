import "server-only";
import { Resend } from "resend";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

const FROM_ADDRESS = "PODEROSAS <hola@poderosas.org>";
const SHEI_EMAIL = "katysheicomunicacion@gmail.com";

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Comprobante de venta para Shei (no para la compradora) — para que
// organice sus ingresos y se lo pase a su contadora cuando corresponda.
// No es una factura electrónica DIAN, es un recibo informativo.
export async function sendReceiptEmail(params: {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  amountCents: number;
  currency: string;
  paidAt: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const pdfBytes = await generateReceiptPdf(params);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: SHEI_EMAIL,
    subject: `Comprobante de venta — ${params.productTitle} (${formatCurrency(params.amountCents, params.currency)})`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#3a2e2e; font-size: 14px; line-height: 1.6;">
        <p>Nueva venta confirmada de <strong>${params.productTitle}</strong>.</p>
        <p>
          Compradora: ${params.buyerName.trim() || "—"} (${params.buyerEmail || "sin correo"})<br />
          Monto: ${formatCurrency(params.amountCents, params.currency)}<br />
          Fecha: ${params.paidAt.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}<br />
          Orden: ${params.orderId}
        </p>
        <p>El comprobante en PDF va adjunto a este correo.</p>
      </div>
    `,
    attachments: [
      {
        filename: `comprobante-${params.orderId}.pdf`,
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  });
}
