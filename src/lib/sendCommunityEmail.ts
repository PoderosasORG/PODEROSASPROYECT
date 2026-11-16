import "server-only";
import { Resend } from "resend";

const FROM_ADDRESS = "PODEROSAS <hola@poderosas.org>";
const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

export function buildCommunityEmailHtml(params: { buyerName: string }) {
  const trimmedName = params.buyerName.trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : "";
  const greeting = firstName ? `Hola, ${firstName}.` : "Hola.";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Grupo de WhatsApp — PODEROSAS</title>
  </head>
  <body style="margin:0; padding:0; background:#fffdf8; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;">
      <tr>
        <td align="center" style="padding: 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width: 520px; background:#ffffff;">

            <tr>
              <td align="center" style="background:#f3e9dc; padding: 36px 24px; border-bottom: 1px solid #e6cd8f;">
                <p style="margin:0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 3px; color:#9a7b2e; text-transform: uppercase;">PODEROSAS</p>
                <p style="margin: 14px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color:#3a2e2e;">Grupo de WhatsApp del evento</p>
              </td>
            </tr>

            <tr>
              <td style="padding: 32px 32px 8px;">
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  ${greeting}
                </p>
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  Vamos a crear un grupo de WhatsApp solo para quienes ya tienen su entrada confirmada a la Masterclass del 21 de noviembre — ahí compartiremos información importante, recomendaciones y sorpresas antes del evento.
                </p>
                <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  Se nos pasó pedirte el número de teléfono al momento de la compra, así que abajo te dejamos exactamente lo que recibirás en ese grupo — y al final te contamos cómo unirte.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e6cd8f; background:#faf5ec;">
                  <tr>
                    <td style="padding: 24px 22px;">
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                        💗✨ <strong>¡BIENVENIDAS A PODEROSAS MASTERCLASS 2026!</strong>
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        ¡Qué alegría tenerlas por aquí! Primero queremos agradecerles por tomar la decisión de regalarse este espacio y elegir invertir en ustedes mismas.
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        Este grupo será nuestro canal oficial de comunicación, donde compartiremos información importante, recomendaciones y sorpresas para prepararnos para vivir juntas esta experiencia.
                      </p>
                      <p style="margin:0 0 6px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.8; color:#3a2e2e;">
                        📅 <strong>Sábado 21 de noviembre</strong><br />
                        ⏰ <strong>9:00 a. m. a 1:00 p. m.</strong><br />
                        📍 Edificio Emprendu – Calle 85 #12-66, Bogotá.
                      </p>
                      <p style="margin:14px 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        🚪 Abrimos puertas desde las 8:30 a. m. Les recomendamos llegar con 15 minutos de anticipación para ingresar con tranquilidad y comenzar puntualmente.
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        👗 ¡Y una recomendación especial! Vayan preparando su outfit más poderoso: ese look con el que se sientan más bonitas, seguras, auténticas y capaces de conquistar el mundo. ¡Queremos verlas brillar! ✨
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        Prepárense para una mañana de aprendizaje, autoconocimiento, conexión, ejercicios prácticos, coffee break, regalos y muchas sorpresas.
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        Recuerden que este grupo estará habilitado únicamente para recibir información de nuestro equipo.
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        Queremos que lleguen con el corazón abierto y la disposición de descubrir todo lo que son capaces de construir.
                      </p>
                      <p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        No vienes solamente a asistir a una masterclass. Vienes a regalarte un encuentro contigo misma. ✨
                      </p>
                      <p style="margin:0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        ¡Estamos contando los días para conocerte!
                      </p>
                      <p style="margin:14px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#3a2e2e;">
                        Con cariño,<br />
                        <strong>Kat, Shei y Luz Amparo</strong><br />
                        Equipo PODEROSAS 💗
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ec;">
                  <tr>
                    <td style="padding: 20px; text-align:center;">
                      <p style="margin:0 0 10px; font-family: Georgia, serif; font-size: 16px; color:#3a2e2e;">¿Cómo te unes al grupo?</p>
                      <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:#6b5e52;">
                        Responde este correo con tu <strong>nombre completo y tu número de WhatsApp</strong>, y te agregamos directamente. También puedes escribirnos a
                        <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a7b2e;">${SUPPORT_EMAIL}</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="background:#3a2e2e; padding: 28px 24px;">
                <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color:#f3e9dc;">
                  Con cariño,<br />Equipo PODEROSAS
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

export async function sendCommunityEmail(params: { to: string; buyerName: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const html = buildCommunityEmailHtml(params);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "💗 Únete al grupo de WhatsApp de PODEROSAS Masterclass 2026",
    html,
  });
}
