import "server-only";
import { Resend } from "resend";
import { formatCopCents, formatDateCo } from "./schedule";

// Correos del pago en cuotas. Son transaccionales (sobre una compra que la
// persona hizo), así que no dependen del consentimiento de marketing.

const FROM_ADDRESS = "PODEROSAS <hola@poderosas.org>";
const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

export type InstallmentEmail =
  | { kind: "pagada"; paidNumber: number; total: number; nextNumber: number; nextAmountCents: number; nextDue: Date; pauseOn: Date; accessUntil: Date }
  | { kind: "completada"; total: number; accessUntil: Date }
  | { kind: "recordatorio"; nextNumber: number; total: number; nextAmountCents: number; nextDue: Date; pauseOn: Date }
  | { kind: "vence_hoy"; nextNumber: number; total: number; nextAmountCents: number; pauseOn: Date }
  | { kind: "pausado"; nextNumber: number; total: number; nextAmountCents: number };

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function content(e: InstallmentEmail) {
  switch (e.kind) {
    case "pagada":
      return {
        subject: `Recibimos tu cuota ${e.paidNumber} de ${e.total} · próxima fecha: ${formatDateCo(e.nextDue)}`,
        title: `Cuota ${e.paidNumber} de ${e.total} recibida`,
        lines: [
          `¡Gracias! Tu pago quedó registrado y tienes acceso a la Metodología PODEROSAS hasta el <strong>${formatDateCo(e.accessUntil)}</strong>.`,
          `<strong>Tu próxima cuota:</strong> la ${e.nextNumber} de ${e.total}, por <strong>${formatCopCents(e.nextAmountCents)} COP</strong>.`,
          `<strong>Fecha límite de pago:</strong> ${formatDateCo(e.nextDue)}.`,
          `Si no se paga, el acceso al siguiente nivel se pausa el ${formatDateCo(e.pauseOn)} y vuelve apenas pagues.`,
        ],
        button: `Pagar la cuota ${e.nextNumber}`,
      };
    case "completada":
      return {
        subject: "¡Completaste tu pago de la Metodología PODEROSAS!",
        title: "Pago completo 💗",
        lines: [
          `Pagaste las ${e.total} cuotas. Ya no tienes pagos pendientes.`,
          `Tu acceso completo a la Metodología PODEROSAS va hasta el <strong>${formatDateCo(e.accessUntil)}</strong>.`,
        ],
        button: "Ver mi plan",
      };
    case "recordatorio":
      return {
        subject: `Recordatorio: tu cuota ${e.nextNumber} vence el ${formatDateCo(e.nextDue)}`,
        title: `Tu cuota ${e.nextNumber} de ${e.total} vence pronto`,
        lines: [
          `Te recordamos que tu cuota ${e.nextNumber} de ${e.total}, por <strong>${formatCopCents(e.nextAmountCents)} COP</strong>, vence el <strong>${formatDateCo(e.nextDue)}</strong>.`,
          `Págala desde el botón para seguir con el siguiente nivel sin interrupciones. Si ya la pagaste, ignora este correo.`,
        ],
        button: `Pagar la cuota ${e.nextNumber}`,
      };
    case "vence_hoy":
      return {
        subject: `Hoy vence tu cuota ${e.nextNumber} de la Metodología PODEROSAS`,
        title: `Hoy vence tu cuota ${e.nextNumber}`,
        lines: [
          `Hoy es la fecha límite de tu cuota ${e.nextNumber} de ${e.total} (<strong>${formatCopCents(e.nextAmountCents)} COP</strong>).`,
          `Tienes hasta el ${formatDateCo(e.pauseOn)} antes de que se pause el acceso al contenido.`,
        ],
        button: `Pagar la cuota ${e.nextNumber}`,
      };
    case "pausado":
      return {
        subject: "Tu acceso está en pausa: recuerda pagar tu cuota",
        title: "Recuerda pagar tu cuota para habilitar el siguiente nivel",
        lines: [
          `Tu acceso a la Metodología PODEROSAS quedó en pausa porque la cuota ${e.nextNumber} de ${e.total} (<strong>${formatCopCents(e.nextAmountCents)} COP</strong>) aún no está paga.`,
          `No pierdes nada: apenas la pagues, se habilita de nuevo todo tu contenido.`,
        ],
        button: `Pagar la cuota ${e.nextNumber}`,
      };
  }
}

export async function sendInstallmentEmail(params: { to: string; name: string | null; payUrl: string; email: InstallmentEmail }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY");
  const c = content(params.email);
  const first = (params.name ?? "").trim().split(/\s+/)[0] || "";
  const greeting = first ? `Hola, ${esc(first)}.` : "Hola.";
  const paragraphs = [greeting, ...c.lines]
    .map(
      (l) =>
        `<p style="margin:0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color:#3a2e2e;">${l}</p>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background:#fffdf8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:520px; background:#ffffff;">
<tr><td align="center" style="background:#f3e9dc; padding:28px 24px; border-bottom:1px solid #e6cd8f;">
<p style="margin:0; font-family: Georgia, serif; font-size:22px; letter-spacing:3px; color:#9a7b2e; text-transform:uppercase;">PODEROSAS</p></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 18px; font-family: Georgia, serif; font-size:22px; color:#3a2e2e; font-weight:normal;">${c.title}</h1>
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td align="center" style="background:#c9a24b;">
<a href="${params.payUrl}" style="display:inline-block; color:#ffffff; font-family: Arial, Helvetica, sans-serif; font-size:13px; letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:14px 32px;">${c.button}</a>
</td></tr></table>
<p style="margin:20px 0 0; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#6b5e52;">
Si tienes alguna pregunta, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a7b2e;">${SUPPORT_EMAIL}</a> o por WhatsApp al +57 314 508 9821.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    greeting,
    ...c.lines.map((l) => l.replace(/<[^>]+>/g, "")),
    `${c.button}: ${params.payUrl}`,
    `¿Dudas? ${SUPPORT_EMAIL} · WhatsApp +57 314 508 9821`,
  ].join("\n\n");

  const { error } = await new Resend(apiKey).emails.send({ from: FROM_ADDRESS, to: params.to, subject: c.subject, html, text });
  if (error) throw new Error(error.message);
}
