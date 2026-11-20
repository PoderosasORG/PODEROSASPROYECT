import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateCertificatePdf(params: {
  buyerName: string;
  courseTitle: string;
  completedAt: Date;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 560]); // horizontal, tipo diploma
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const gold = rgb(0.788, 0.635, 0.294);
  const dark = rgb(0.227, 0.18, 0.18);
  const beige = rgb(0.973, 0.949, 0.918);

  page.drawRectangle({ x: 0, y: 0, width: 792, height: 560, color: beige });
  page.drawRectangle({ x: 24, y: 24, width: 744, height: 512, borderColor: gold, borderWidth: 2 });
  page.drawRectangle({ x: 32, y: 32, width: 728, height: 496, borderColor: gold, borderWidth: 0.75 });

  const centerText = (text: string, y: number, font: typeof serif, size: number, color = dark) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: 396 - width / 2, y, size, font, color });
  };

  centerText("PODEROSAS", 460, serif, 22, gold);
  centerText("Certificado de finalización", 410, sans, 13, dark);

  centerText("Se otorga el presente certificado a", 340, sans, 12, rgb(0.42, 0.37, 0.33));
  centerText(params.buyerName.trim() || "Mujer PODEROSA", 300, serif, 30, dark);

  centerText("por haber completado la", 255, sans, 12, rgb(0.42, 0.37, 0.33));
  centerText(params.courseTitle, 225, serifItalic, 18, gold);

  centerText(
    params.completedAt.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }),
    170,
    sans,
    11,
    rgb(0.42, 0.37, 0.33),
  );

  page.drawLine({ start: { x: 296, y: 80 }, end: { x: 496, y: 80 }, thickness: 1, color: gold });
  centerText("PODEROSAS — Kat, Shei y Luz", 62, sans, 10, rgb(0.42, 0.37, 0.33));

  return pdfDoc.save();
}
