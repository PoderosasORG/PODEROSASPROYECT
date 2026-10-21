import "server-only";
import { Resend } from "resend";
import QRCode from "qrcode";

// Mientras el DNS de poderosas.org no esté configurado en Resend, los
// correos salen desde su dirección de pruebas (onboarding@resend.dev).
// Cuando el dominio esté verificado en Resend, cambiar esto a algo como
// "Poderosas <boletas@poderosas.org>".
const FROM_ADDRESS = "Poderosas <onboarding@resend.dev>";

const EVENT_DATE = "21 de noviembre";
const EVENT_TIME = "8:30 a. m. a 1:00 p. m.";
const EVENT_PLACE = "Edificio Emprendu — Calle 85 #12-66, Bogotá";

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
  const qrPng = await QRCode.toBuffer(params.ticketId, { width: 500, margin: 2 });
  const firstName = params.buyerName.trim().split(/\s+/)[0] || params.buyerName;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: `${firstName}, tu cupo para Poderosas en vivo ya está confirmado`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #2b2320;">
        <p style="font-size: 16px;">Hola ${firstName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          ¡Gracias por tu compra! Tu cupo para
          <strong>${params.eventTitle}</strong> ya quedó confirmado.
          Nos encanta que vayas a estar ahí — este es el primer encuentro
          en persona de Poderosas, y queremos que sea inolvidable.
        </p>
        <table style="width: 100%; margin: 24px 0; font-size: 15px; line-height: 1.6;">
          <tr><td style="padding: 4px 0; color: #9a7b2e;">📅 Fecha</td><td>${EVENT_DATE}</td></tr>
          <tr><td style="padding: 4px 0; color: #9a7b2e;">🕒 Horario</td><td>${EVENT_TIME}</td></tr>
          <tr><td style="padding: 4px 0; color: #9a7b2e;">📍 Lugar</td><td>${EVENT_PLACE}</td></tr>
        </table>
        <p style="font-size: 16px; line-height: 1.6;">
          Muestra el código QR de abajo (va adjunto también como imagen)
          en la entrada — con eso te damos la bienvenida. No necesitas
          imprimirlo, basta con mostrarlo desde el celular.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <img src="cid:boleta-qr" alt="Código QR de tu boleta" width="260" height="260" />
        </div>
        <p style="font-size: 13px; color: #8a7a6e;">
          Código de tu boleta: ${params.ticketId}
        </p>
        <p style="font-size: 16px; margin-top: 24px;">Nos vemos pronto,<br />Poderosas</p>
      </div>
    `,
    attachments: [
      {
        filename: "boleta.png",
        content: qrPng.toString("base64"),
        contentId: "boleta-qr",
      },
    ],
  });
}
