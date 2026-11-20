import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Datos de Shei como vendedora para el comprobante. PENDIENTE: completar
// con su nombre/razón social y cédula o NIT reales (ella los va a dar) —
// mientras tanto queda este marcador visible en el propio PDF, nunca un
// dato inventado.
const SELLER_NAME = "[Nombre completo / razón social pendiente]";
const SELLER_ID = "[Cédula / NIT pendiente]";

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function generateReceiptPdf(params: {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  amountCents: number;
  currency: string;
  paidAt: Date;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 560]);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const gold = rgb(0.788, 0.635, 0.294);
  const dark = rgb(0.227, 0.18, 0.18);
  const beige = rgb(0.953, 0.914, 0.863);
  const grayText = rgb(0.42, 0.37, 0.33);

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 560, color: rgb(1, 0.992, 0.973) });
  page.drawRectangle({ x: 0, y: 490, width: 420, height: 70, color: beige });
  page.drawText("PODEROSAS", {
    x: 32,
    y: 528,
    size: 18,
    font: serif,
    color: dark,
  });
  page.drawText("Comprobante de venta", {
    x: 32,
    y: 505,
    size: 11,
    font: sans,
    color: grayText,
  });

  let y = 455;
  const row = (label: string, value: string) => {
    page.drawText(label, { x: 32, y, size: 9, font: sansBold, color: gold });
    y -= 14;
    page.drawText(value, { x: 32, y, size: 11, font: sans, color: dark });
    y -= 26;
  };

  row("Número de orden", params.orderId);
  row("Fecha de pago", params.paidAt.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }));
  row("Producto", params.productTitle);
  row("Comprador(a)", params.buyerName.trim() || "—");
  row("Correo del comprador(a)", params.buyerEmail || "—");

  page.drawLine({
    start: { x: 32, y: y + 10 },
    end: { x: 388, y: y + 10 },
    thickness: 1,
    color: gold,
  });
  y -= 10;

  page.drawText("Total pagado", { x: 32, y, size: 9, font: sansBold, color: gold });
  y -= 22;
  page.drawText(formatCurrency(params.amountCents, params.currency), {
    x: 32,
    y,
    size: 22,
    font: serif,
    color: dark,
  });
  y -= 50;

  page.drawText("Vendedora", { x: 32, y, size: 9, font: sansBold, color: gold });
  y -= 16;
  page.drawText(SELLER_NAME, { x: 32, y, size: 10, font: sans, color: dark });
  y -= 14;
  page.drawText(SELLER_ID, { x: 32, y, size: 10, font: sans, color: dark });

  page.drawText("Documento informativo para control interno — no constituye factura electrónica.", {
    x: 32,
    y: 36,
    size: 7,
    font: sans,
    color: grayText,
  });

  return pdfDoc.save();
}
