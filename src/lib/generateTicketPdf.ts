import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const EVENT_LINES = {
  title: "MASTERCLASS PRESENCIAL DE PODEROSAS",
  date: "Sábado, 21 de noviembre de 2026",
  time: "9:00 a. m. a 1:00 p. m.",
  place: "Edificio Emprendu",
  address: "Calle 85 # 12-66, Bogotá, Colombia",
};

// Entrada descargable en PDF — mismo QR real que va en el correo (el
// id de la boleta), con los datos reales de la compra. Sin datos
// inventados: si no hay nombre, se usa un saludo neutro.
export async function generateTicketPdf(params: { buyerName: string; ticketId: string }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([360, 560]);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const gold = rgb(0.788, 0.635, 0.294); // #c9a24b
  const dark = rgb(0.227, 0.18, 0.18); // #3a2e2e
  const beige = rgb(0.953, 0.914, 0.863); // #f3e9dc

  page.drawRectangle({ x: 0, y: 0, width: 360, height: 560, color: rgb(1, 0.992, 0.973) });
  page.drawRectangle({ x: 0, y: 480, width: 360, height: 80, color: beige });
  page.drawText("PODEROSAS", {
    x: 360 / 2 - serif.widthOfTextAtSize("PODEROSAS", 20) / 2,
    y: 510,
    size: 20,
    font: serif,
    color: dark,
  });

  let y = 450;
  const buyerName = params.buyerName.trim() || "Poderosa invitada";
  page.drawText(`Entrada de ${buyerName}`, { x: 24, y, size: 13, font: sans, color: dark });
  y -= 28;

  page.drawText(EVENT_LINES.title, { x: 24, y, size: 11, font: serif, color: gold });
  y -= 20;
  for (const line of [
    EVENT_LINES.date,
    EVENT_LINES.time,
    EVENT_LINES.place,
    EVENT_LINES.address,
  ]) {
    page.drawText(line, { x: 24, y, size: 10, font: sans, color: dark });
    y -= 16;
  }

  y -= 12;
  const qrDataUrl = await QRCode.toDataURL(params.ticketId, { width: 400, margin: 1 });
  const qrPngBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrPngBytes);
  const qrSize = 220;
  page.drawRectangle({
    x: 360 / 2 - qrSize / 2 - 10,
    y: y - qrSize - 20,
    width: qrSize + 20,
    height: qrSize + 20,
    borderColor: gold,
    borderWidth: 1.5,
  });
  page.drawImage(qrImage, {
    x: 360 / 2 - qrSize / 2,
    y: y - qrSize - 10,
    width: qrSize,
    height: qrSize,
  });
  y -= qrSize + 40;

  page.drawText(`Código de tu entrada: ${params.ticketId}`, {
    x: 360 / 2 - sans.widthOfTextAtSize(`Código de tu entrada: ${params.ticketId}`, 7) / 2,
    y,
    size: 7,
    font: sans,
    color: rgb(0.54, 0.48, 0.43),
  });

  return pdfDoc.save();
}
