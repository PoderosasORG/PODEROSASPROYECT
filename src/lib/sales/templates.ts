// Plantillas de WhatsApp para el equipo (se envían A MANO, una a una,
// solo a contactos que dieron su número y autorizaron que les escribamos).
// Tono: cálido, humano y claro. Sin falsos contadores, sin escasez
// inventada y sin hacer sentir culpable a nadie por no comprar.
// {nombre}, {link} y {fecha} se reemplazan al abrir WhatsApp.

export type WaTemplate = { key: string; label: string; text: string };

export const WA_TEMPLATES: WaTemplate[] = [
  {
    key: "gracias_masterclass",
    label: "Agradecimiento por la masterclass",
    text:
      "¡Hola, {nombre}! 💗 Gracias por acompañarnos en la Masterclass PODEROSAS. Fue muy especial compartir contigo ese espacio. " +
      "Esperamos que te hayas llevado algo valioso para ti. Si quieres contarnos cómo te sentiste o tienes alguna pregunta, aquí estamos. Un abrazo, Luz Amparo, Shei y Kat.",
  },
  {
    key: "presentacion_metodologia",
    label: "Presentación de la metodología",
    text:
      "Hola, {nombre} 🌸 Te compartimos la Metodología PODEROSAS 2026–2027: un acompañamiento de 6 meses para reconocer quién eres, descubrir qué quieres y convertirlo en acción. " +
      "Incluye módulos en video, cartillas, 6 clases en vivo y una comunidad privada. Aquí puedes ver todos los detalles con calma: {link} " +
      "Si te surge cualquier duda, con gusto te respondemos.",
  },
  {
    key: "explicacion_bonos",
    label: "Explicación de los bonos",
    text:
      "Hola, {nombre} 💗 Te cuento sobre los bonos: al inscribirte en la Metodología PODEROSAS recibes 3 regalos (una masterclass de marca personal, el ebook «50 acuerdos de pareja» y un reto de 7 días para enfocarte en ti). " +
      "Los entregamos en la comunidad privada. Puedes ver la información completa aquí: {link}",
  },
  {
    key: "respuesta_dudas",
    label: "Respuesta a dudas",
    text:
      "Hola, {nombre}, gracias por escribirnos 🌷 Con mucho gusto te ayudamos. Cuéntanos tu duda con tranquilidad y te respondemos lo más claro posible. " +
      "Lo importante es que tomes la decisión que sea mejor para ti.",
  },
  {
    key: "recordatorio_inscripcion",
    label: "Recordatorio de inscripción",
    text:
      "Hola, {nombre} 🌸 Te escribimos solo para recordarte que el precio especial de la Metodología PODEROSAS está disponible hasta el {fecha} (hora Colombia). " +
      "Si es para ti, aquí puedes inscribirte: {link}. Y si no es el momento, no pasa nada: igual nos alegra que hagas parte de la comunidad. 💗",
  },
  {
    key: "cierre_lanzamiento",
    label: "Cierre de lanzamiento",
    text:
      "Hola, {nombre} 💗 Queríamos contarte que el lanzamiento de la Metodología PODEROSAS cierra el {fecha} (hora Colombia). " +
      "Gracias por todo el cariño que recibimos en estos días. Si decides unirte, aquí está el enlace: {link}. Y si no, te seguimos acompañando con nuestro contenido. ¡Un abrazo grande!",
  },
  {
    key: "bienvenida",
    label: "Bienvenida a nuevas integrantes",
    text:
      "¡Bienvenida, {nombre}! 🎉💗 Qué alegría tenerte en la primera generación de la Metodología PODEROSAS. " +
      "Te llegó un correo con tus primeros pasos (revisa también Promociones o Spam). Si algo no te funciona, escríbenos por aquí y te ayudamos. ¡Empezamos juntas!",
  },
];

export function fillTemplate(text: string, vars: { nombre?: string | null; link: string; fecha: string }) {
  const first = (vars.nombre ?? "").trim().split(/\s+/)[0] || "";
  return text
    .replaceAll("{nombre}", first)
    .replace(/Hola, ,/g, "Hola,")
    .replace(/¡Hola, !/g, "¡Hola!")
    .replace(/¡Bienvenida, !/g, "¡Bienvenida!")
    .replaceAll("{link}", vars.link)
    .replaceAll("{fecha}", vars.fecha);
}
