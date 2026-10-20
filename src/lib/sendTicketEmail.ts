import "server-only";
import { Resend } from "resend";
import QRCode from "qrcode";

// Mientras el DNS de poderosas.org no esté configurado en Resend, los
// correos salen desde su dirección de pruebas (onboarding@resend.dev).
// Cuando el dominio esté verificado en Resend, cambiar esto a algo como
// "Poderosas <boletas@poderosas.org>".
const FROM_ADDRESS = "Poderosas <onboarding@resend.dev>";

export async function sendTicketEmail(params: {
  to: string;
  buyerName: string;
  eventTitle: string;
  ticketId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const qrPng = await QRCode.toBuffer(params.ticketId, { width: 400 });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: `Tu boleta: ${params.eventTitle}`,
    html: `
      <p>Hola ${params.buyerName},</p>
      <p>Tu cupo para <strong>${params.eventTitle}</strong> quedó confirmado.</p>
      <p>Muestra este código QR en la entrada (está adjunto a este correo).</p>
      <p>Código de tu boleta: <code>${params.ticketId}</code></p>
    `,
    attachments: [
      {
        filename: "boleta.png",
        content: qrPng.toString("base64"),
      },
    ],
  });
}
