import "server-only";
import { Resend } from "resend";
import QRCode from "qrcode";

// Mientras el DNS de poderosas.org no esté configurado en Resend, los
// correos salen desde su dirección de pruebas (onboarding@resend.dev).
// Cuando el dominio esté verificado en Resend, cambiar esto a algo como
// "Poderosas <boletas@poderosas.org>".
const FROM_ADDRESS = "Poderosas <onboarding@resend.dev>";

// Correo de soporte provisional — fácil de reemplazar cuando exista
// el correo oficial de Poderosas (un solo lugar para cambiarlo).
const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

const EVENT_TITLE = "MASTERCLASS PRESENCIAL DE PODEROSAS";
const EVENT_DATE = "Sábado, 21 de noviembre de 2026";
const EVENT_TIME = "9:00 a. m. a 1:00 p. m.";
const EVENT_PLACE = "Edificio Emprendu";
const EVENT_ADDRESS = "Calle 85 # 12-66, Bogotá, Colombia";

// Link de búsqueda de Google Maps con la dirección real tal cual —
// nunca coordenadas inventadas. Google resuelve la ubicación exacta
// a partir del texto de la dirección.
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${EVENT_PLACE}, ${EVENT_ADDRESS}`,
)}`;

// Separado de sendTicketEmail para poder generar una vista previa del
// HTML sin enviar ningún correo real (usado en control de calidad).
export function buildTicketEmailHtml(params: {
  buyerName: string;
  ticketId: string;
  siteUrl: string;
  qrSrc: string;
}) {
  const trimmedName = params.buyerName.trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : "";
  const greeting = firstName ? `Hola, ${firstName}.` : "Hola.";
  const pdfUrl = `${params.siteUrl}/api/boleta/${params.ticketId}/pdf`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tu entrada — Poderosas</title>
  </head>
  <body style="margin:0; padding:0; background:#fffdf8; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;">
      <tr>
        <td align="center" style="padding: 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width: 520px; background:#ffffff;">

            <!-- Encabezado -->
            <tr>
              <td align="center" style="background:#f3e9dc; padding: 36px 24px; border-bottom: 1px solid #e6cd8f;">
                <p style="margin:0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 3px; color:#9a7b2e; text-transform: uppercase;">Poderosas</p>
                <p style="margin: 14px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color:#3a2e2e;">Confirmación de compra</p>
              </td>
            </tr>

            <!-- Mensaje de bienvenida -->
            <tr>
              <td style="padding: 32px 32px 8px;">
                <h1 style="margin:0 0 16px; font-family: Georgia, serif; font-size: 24px; color:#3a2e2e; font-weight: normal;">¡Tu entrada está confirmada!</h1>
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  ${greeting} ¡Gracias por ser parte de la Masterclass presencial de Poderosas!
                </p>
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  Tu lugar está reservado y nos alegra saber que compartirás este encuentro con nosotras.
                </p>
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  Hemos preparado este espacio para que te regales un momento para ti, conectes con lo que quieres y te lleves herramientas e ideas que puedas aplicar en tu vida.
                </p>
                <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  ¡Nos vemos pronto!
                </p>
              </td>
            </tr>

            <!-- Información del evento -->
            <tr>
              <td style="padding: 24px 32px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e6cd8f;">
                  <tr>
                    <td style="padding: 18px 20px 6px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color:#9a7b2e;">
                      Información del evento
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 20px 16px; font-family: Georgia, serif; font-size: 16px; color:#3a2e2e;">
                      ${EVENT_TITLE}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 20px 4px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color:#3a2e2e; line-height: 1.8;">
                      <strong>Fecha:</strong> ${EVENT_DATE}<br />
                      <strong>Hora:</strong> ${EVENT_TIME}<br />
                      <strong>Lugar:</strong> ${EVENT_PLACE}<br />
                      <strong>Dirección:</strong> ${EVENT_ADDRESS}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 16px 20px 20px;">
                      <a href="${MAPS_URL}" style="display:inline-block; background:#c9a24b; color:#ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; text-decoration:none; padding: 12px 28px;">
                        Cómo llegar
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Entrada digital / QR -->
            <tr>
              <td style="padding: 24px 32px 8px;">
                <p style="margin:0 0 4px; font-family: Georgia, serif; font-size: 18px; color:#3a2e2e;">Entrada digital</p>
                <p style="margin:0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color:#6b5e52;">
                  Esta es tu entrada. Guárdala para el día del evento.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #c9a24b;">
                  <tr>
                    <td align="center" style="padding: 28px 20px;">
                      <img src="${params.qrSrc}" alt="Código QR de tu entrada" width="220" height="220" style="display:block; border:0;" />
                      <p style="margin: 16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 1px; color:#9a8a7c;">
                        CÓDIGO DE TU ENTRADA · ${params.ticketId}
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color:#6b5e52;">
                  Presenta este código QR al llegar para validar tu entrada. No es necesario presentar documento de identidad: basta con presentar la entrada.
                </p>
                <p style="margin:16px 0 0; text-align:center;">
                  <a href="${pdfUrl}" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color:#9a7b2e; text-decoration: underline;">
                    Descargar mi entrada en PDF
                  </a>
                </p>
              </td>
            </tr>

            <!-- Información útil -->
            <tr>
              <td style="padding: 24px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ec;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="margin:0 0 8px; font-family: Georgia, serif; font-size: 15px; color:#3a2e2e;">Ten tu entrada a mano</p>
                      <p style="margin:0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color:#6b5e52;">
                        Guarda este correo para que puedas acceder fácilmente a tu entrada el día del evento.
                      </p>
                      <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color:#6b5e52;">
                        Si tienes algún inconveniente con tu entrada o necesitas ayuda, puedes escribirnos a
                        <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a7b2e;">${SUPPORT_EMAIL}</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Cierre -->
            <tr>
              <td align="center" style="background:#3a2e2e; padding: 32px 24px;">
                <p style="margin:0 0 6px; font-family: Georgia, serif; font-size: 15px; color:#f3e9dc; font-style: italic;">
                  Un espacio para ti, una oportunidad para conectar contigo.
                </p>
                <p style="margin:0 0 20px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color:#cdbfae; max-width: 380px;">
                  Gracias por elegir ser parte de Poderosas. Nos vemos pronto para compartir una experiencia de aprendizaje, reflexión y conexión.
                </p>
                <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color:#f3e9dc;">
                  Con cariño,<br />Equipo Poderosas
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;
}

export async function sendTicketEmail(params: {
  to: string;
  buyerName: string;
  ticketId: string;
  siteUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const qrPng = await QRCode.toBuffer(params.ticketId, { width: 500, margin: 2 });
  const html = buildTicketEmailHtml({ ...params, qrSrc: "cid:boleta-qr" });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Tu entrada para la Masterclass presencial de Poderosas está confirmada",
    html,
    attachments: [
      {
        filename: "boleta.png",
        content: qrPng.toString("base64"),
        contentId: "boleta-qr",
      },
    ],
  });
}
