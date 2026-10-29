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
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; background: #fffdf8; color: #3a2e2e;">
        <div style="background: linear-gradient(135deg, #f3e9dc, #faf5ec); padding: 32px 24px; text-align: center; border-bottom: 3px solid #c9a24b;">
          <p style="margin: 0; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #c9a24b; font-weight: bold;">Poderosas</p>
          <h1 style="margin: 12px 0 0; font-size: 26px; color: #3a2e2e;">¡Bienvenida, ${firstName}!</h1>
        </div>

        <div style="padding: 28px 28px 8px;">
          <p style="font-size: 16px; line-height: 1.6;">
            ¡Gracias por tu compra! Tu cupo para
            <strong>${params.eventTitle}</strong> ya quedó confirmado.
            Nos encanta que vayas a estar ahí — este es el primer encuentro
            en persona de Poderosas, y queremos que sea inolvidable.
          </p>
        </div>

        <div style="margin: 20px 28px; border: 1px solid #e6cd8f; border-radius: 16px; overflow: hidden;">
          <div style="background: #f3e9dc; padding: 10px 20px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #9a7b2e; font-weight: bold;">
            Detalles del evento
          </div>
          <table style="width: 100%; font-size: 15px; line-height: 1.6; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 20px; color: #9a7b2e; white-space: nowrap;">📅 Fecha</td>
              <td style="padding: 12px 20px 12px 0;">${EVENT_DATE}</td>
            </tr>
            <tr>
              <td style="padding: 0 20px 12px; color: #9a7b2e; white-space: nowrap;">🕒 Horario</td>
              <td style="padding: 0 20px 12px 0;">${EVENT_TIME}</td>
            </tr>
            <tr>
              <td style="padding: 0 20px 16px; color: #9a7b2e; white-space: nowrap;">📍 Lugar</td>
              <td style="padding: 0 20px 16px 0;">${EVENT_PLACE}</td>
            </tr>
          </table>
        </div>

        <div style="margin: 24px 28px 0; text-align: center;">
          <p style="font-size: 16px; line-height: 1.6;">
            Muestra este código QR en la entrada — con eso te damos la
            bienvenida. No necesitas imprimirlo, basta con mostrarlo desde
            el celular.
          </p>
        </div>

        <div style="margin: 16px 28px 28px; border: 2px solid #c9a24b; border-radius: 16px; padding: 24px; text-align: center; background: #fffdf8;">
          <img src="cid:boleta-qr" alt="Código QR de tu boleta" width="220" height="220" style="display: block; margin: 0 auto;" />
          <p style="font-size: 12px; color: #8a7a6e; margin: 16px 0 0; letter-spacing: 1px;">
            CÓDIGO DE TU BOLETA · ${params.ticketId}
          </p>
        </div>

        <div style="background: #3a2e2e; padding: 24px; text-align: center;">
          <p style="color: #faf5ec; font-size: 15px; margin: 0;">Nos vemos pronto</p>
          <p style="color: #e6cd8f; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin: 8px 0 0;">Poderosas</p>
        </div>
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
