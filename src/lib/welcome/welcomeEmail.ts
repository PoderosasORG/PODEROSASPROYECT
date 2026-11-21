import "server-only";
import { Resend } from "resend";
import { formatPlannedDate, formatSessionDate, type CourseInfo } from "@/lib/welcome/courseInfo";

const FROM_ADDRESS = "PODEROSAS <hola@poderosas.org>";
const SUPPORT_EMAIL = "katysheicomunicacion@gmail.com";

const C = {
  plum: "#5c1030",
  dark: "#2b0f1d",
  pink: "#fbe4ec",
  rose: "#f7c9d8",
  gold: "#bd7d47",
  text: "#3a2e2e",
  soft: "#6b5e52",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function button(href: string, label: string, bg = C.plum) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${bg}; border-radius: 999px;">
    <a href="${href}" style="display:inline-block; color:#ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; text-decoration:none; padding: 13px 28px;">${label}</a>
  </td></tr></table>`;
}

function section(num: string, title: string, body: string) {
  return `<tr><td style="padding: 22px 32px 0;">
    <p style="margin:0 0 6px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color:${C.gold};">${num}</p>
    <p style="margin:0 0 8px; font-family: Georgia, serif; font-size: 19px; color:${C.dark};">${title}</p>
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color:${C.text};">${body}</div>
  </td></tr>`;
}

export function buildWelcomeEmailHtml(params: {
  buyerName: string;
  courseUrl: string;
  loginUrl: string;
  setPasswordUrl?: string;
  accessUntil: string | null;
  whatsappUrl: string | null;
  preferencesUrl: string | null;
  info: CourseInfo;
}) {
  const first = params.buyerName.trim().split(/\s+/)[0] ?? "";
  const hello = first ? `Hola, ${esc(first)}` : "Hola";
  const until = params.accessUntil
    ? new Date(params.accessUntil).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" })
    : null;
  const { info } = params;

  const account = params.setPasswordUrl
    ? `<p style="margin:0 0 12px;">Ya te creamos tu cuenta con este correo. Solo falta un paso: <strong>elegir tu contraseña</strong>.</p>
       ${button(params.setPasswordUrl, "Crear mi contraseña")}
       <p style="margin:12px 0 0; font-size:12px; color:${C.soft};">El botón vence por seguridad. Si ya expiró, entra a <a href="${params.loginUrl}" style="color:${C.plum};">poderosas.org/login</a> y elige «¿Olvidaste tu contraseña?» con este mismo correo.</p>`
    : `<p style="margin:0 0 12px;">Tu compra quedó asociada a la cuenta que ya tienes con este correo. Inicia sesión como siempre:</p>
       ${button(params.loginUrl, "Iniciar sesión")}`;

  const community = params.whatsappUrl
    ? `<p style="margin:0 0 12px;">Aquí compartimos los avisos, las clases en vivo y nos acompañamos entre todas.</p>
       ${button(params.whatsappUrl, "Unirme a la comunidad", "#1f8f4e")}`
    : `<p style="margin:0;">En los próximos días te enviaremos el enlace de acceso a la comunidad privada de WhatsApp.</p>`;

  const sessions = info.sessions.length
    ? `<ul style="margin:0; padding-left:18px;">${info.sessions
        .map((s) => `<li style="margin-bottom:4px;"><strong>${esc(s.title)}</strong> — ${esc(formatSessionDate(s.startsAt))} (hora Colombia)</li>`)
        .join("")}</ul>
       <p style="margin:10px 0 0; font-size:12px; color:${C.soft};">El calendario siempre está actualizado en tu panel del curso.</p>`
    : `<p style="margin:0;">Estamos cerrando las fechas de los encuentros grupales en vivo. Las verás en tu panel del curso y te avisaremos por la comunidad.</p>`;

  const upcoming = info.upcomingModules.length
    ? `<p style="margin:12px 0 6px;">Y esto es lo que viene:</p>
       <ul style="margin:0; padding-left:18px;">${info.upcomingModules
         .slice(0, 8)
         .map(
           (m) =>
             `<li style="margin-bottom:3px;">${esc(m.title)}${m.category ? ` <span style="color:${C.soft};">(${esc(m.category)})</span>` : ""} — ${
               m.plannedDate ? esc(formatPlannedDate(m.plannedDate)) : "fecha por confirmar"
             }</li>`,
         )
         .join("")}</ul>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Bienvenida a la Metodología PODEROSAS</title></head>
<body style="margin:0; padding:0; background:${C.pink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pink};"><tr><td align="center" style="padding: 24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:560px; background:#ffffff; border-radius: 18px; overflow:hidden;">

  <tr><td align="center" style="background:${C.plum}; padding: 40px 28px;">
    <p style="margin:0; font-family: Georgia, serif; font-size: 13px; letter-spacing: 4px; color:${C.rose}; text-transform: uppercase;">PODEROSAS</p>
    <p style="margin:14px 0 0; font-family: Georgia, serif; font-size: 28px; line-height:1.25; color:#ffffff;">Bienvenida a la Metodología PODEROSAS 2026–2027</p>
    <p style="margin:10px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color:${C.rose};">Primera generación</p>
  </td></tr>

  <tr><td style="padding: 32px 32px 4px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.75; color:${C.text};">
    <p style="margin:0 0 14px; font-family: Georgia, serif; font-size: 20px; color:${C.dark};">${hello} 💗</p>
    <p style="margin:0 0 12px;">Tu pago quedó confirmado y ya eres parte de esta primera generación. Gracias por regalarte este proceso: aquí vas a reconocer quién eres, descubrir qué quieres y convertirlo en acción.</p>
    <p style="margin:0;">Te contamos todo lo que necesitas para empezar.</p>
  </td></tr>

  ${section("Paso 1", "Entra a tu cuenta", account)}

  ${section(
    "Paso 2",
    "Tu acceso",
    `<p style="margin:0 0 12px;">Tienes <strong>6 meses de acceso</strong>${until ? `, hasta el <strong>${esc(until)}</strong>` : ""}. Antes de que se venza te avisaremos para que puedas renovar.</p>
     <p style="margin:0 0 12px;">Hoy ya tienes <strong>${info.publishedModules} módulos disponibles</strong>${info.materialCount ? ` y <strong>material descargable</strong> (cartillas y ejercicios)` : ""}.</p>
     ${upcoming}
     <div style="margin-top:14px;">${button(params.courseUrl, "Entrar a mi curso", C.gold)}</div>`,
  )}

  ${section("Paso 3", "Únete a la comunidad privada", community)}

  ${section("Paso 4", "Calendario de encuentros grupales", sessions)}

  ${section(
    "Tus regalos",
    "3 bonos por tu compra",
    `<p style="margin:0 0 8px;">Por ser parte de la Metodología PODEROSAS recibes <strong>3 bonos de regalo</strong>. Los anunciaremos y entregaremos <strong>en vivo por la comunidad privada</strong>, así que no te pierdas los avisos.</p>
     ${info.hasEbook ? `<p style="margin:0;">Y ya puedes descargar el <strong>Ebook «50 acuerdos de pareja»</strong> desde tu panel del curso, en «Tu acceso incluye».</p>` : ""}`,
  )}

  <tr><td style="padding: 28px 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pink}; border-radius: 14px;"><tr><td style="padding: 18px 20px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color:${C.text};">
      ¿Tienes alguna duda? Escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${C.plum};">${SUPPORT_EMAIL}</a> o por la comunidad. Estamos para acompañarte.
      <p style="margin:12px 0 0; font-family: Georgia, serif; font-size: 15px; color:${C.dark};">Con cariño,<br/>Luz Amparo, Shei y Kat</p>
    </td></tr></table>
  </td></tr>

  <tr><td align="center" style="padding: 18px 32px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.6; color:#9a8f86;">
    Recibes este correo porque compraste la Metodología PODEROSAS: es un mensaje operativo sobre tu compra y tu acceso.
    ${params.preferencesUrl ? `<br/>Puedes decidir si quieres recibir novedades y lanzamientos en <a href="${params.preferencesUrl}" style="color:${C.plum};">tus preferencias de comunicación</a>.` : ""}
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export async function sendWelcomeEmail(params: Parameters<typeof buildWelcomeEmailHtml>[0] & { to: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    replyTo: SUPPORT_EMAIL,
    subject: "💗 Bienvenida a la Metodología PODEROSAS — tus primeros pasos",
    html: buildWelcomeEmailHtml(params),
  });
  if (error) throw new Error(error.message);
}
