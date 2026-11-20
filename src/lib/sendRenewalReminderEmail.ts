import "server-only";
import { Resend } from "resend";

const FROM_ADDRESS = "PODEROSAS <hola@poderosas.org>";
const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

function buildHtml(params: {
  buyerName: string;
  productTitle: string;
  renewUrl: string;
  variant: "7d" | "expiry";
}) {
  const firstName = params.buyerName.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Hola, ${firstName}.` : "Hola.";

  const message =
    params.variant === "7d"
      ? `Tu acceso a <strong>${params.productTitle}</strong> se vence en 7 días. Si quieres seguir teniendo acceso a los módulos, los encuentros en vivo y la comunidad, puedes renovar desde ya.`
      : `Tu acceso a <strong>${params.productTitle}</strong> ya se venció. Si quieres recuperarlo y seguir con tu proceso, puedes renovar cuando quieras.`;

  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0; padding:0; background:#fffdf8; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;">
      <tr>
        <td align="center" style="padding: 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width: 520px; background:#ffffff;">
            <tr>
              <td align="center" style="background:#f3e9dc; padding: 32px 24px; border-bottom: 1px solid #e6cd8f;">
                <p style="margin:0; font-family: Georgia, serif; font-size: 22px; letter-spacing: 3px; color:#9a7b2e; text-transform: uppercase;">PODEROSAS</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h1 style="margin:0 0 16px; font-family: Georgia, serif; font-size: 22px; color:#3a2e2e; font-weight: normal;">
                  ${params.variant === "7d" ? "Tu acceso está por vencerse" : "Tu acceso se venció"}
                </h1>
                <p style="margin:0 0 20px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">
                  ${greeting} ${message}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background:#c9a24b;">
                      <a href="${params.renewUrl}" style="display:inline-block; color:#ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; text-decoration:none; padding: 14px 32px;">
                        Renovar mi acceso
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color:#6b5e52;">
                  Si tienes alguna pregunta, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a7b2e;">${SUPPORT_EMAIL}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendRenewalReminderEmail(params: {
  to: string;
  buyerName: string;
  productTitle: string;
  renewUrl: string;
  variant: "7d" | "expiry";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY");

  const resend = new Resend(apiKey);
  const html = buildHtml(params);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject:
      params.variant === "7d"
        ? `Tu acceso a ${params.productTitle} se vence en 7 días`
        : `Tu acceso a ${params.productTitle} se venció`,
    html,
  });
}
