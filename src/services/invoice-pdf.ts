import "server-only";

import type { Prisma } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/format";

type PdfInvoice = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    items: {
      orderBy: {
        createdAt: "asc";
      };
    };
  };
}>;

type PdfPage = {
  commands: string[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function cleanText(value: string) {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfText(page: PdfPage, x: number, y: number, text: string, options?: { size?: number; bold?: boolean }) {
  const size = options?.size ?? 10;
  const font = options?.bold ? "F2" : "F1";

  page.commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${cleanText(text)}) Tj ET`);
}

function pdfLine(page: PdfPage, x1: number, y1: number, x2: number, y2: number, gray = 0.82) {
  page.commands.push(`${gray} G ${x1} ${y1} m ${x2} ${y2} l S 0 G`);
}

function pdfRect(page: PdfPage, x: number, y: number, width: number, height: number, options?: { fillGray?: number; strokeGray?: number }) {
  if (typeof options?.fillGray === "number") {
    page.commands.push(`${options.fillGray} g ${x} ${y} ${width} ${height} re f 0 g`);
  }

  if (typeof options?.strokeGray === "number") {
    page.commands.push(`${options.strokeGray} G ${x} ${y} ${width} ${height} re S 0 G`);
  }
}

function rightText(page: PdfPage, xRight: number, y: number, text: string, options?: { size?: number; bold?: boolean }) {
  const size = options?.size ?? 10;
  const approximateWidth = cleanText(text).length * size * 0.52;
  pdfText(page, xRight - approximateWidth, y, text, options);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [value];
}

function createPage() {
  const page: PdfPage = {
    commands: ["0.2 w"]
  };

  return page;
}

function buildInvoicePages(invoice: PdfInvoice) {
  const pages = [createPage()];
  let page = pages[0];
  let y = PAGE_HEIGHT - MARGIN;
  const clientStatus = invoice.status === "PAID" ? "PAID" : "UNPAID";

  const addPage = () => {
    page = createPage();
    pages.push(page);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 96) {
      addPage();
    }
  };

  pdfRect(page, 0, PAGE_HEIGHT - 116, PAGE_WIDTH, 116, { fillGray: 0.96 });
  pdfText(page, MARGIN, PAGE_HEIGHT - 70, "INVOICE", { size: 28, bold: true });
  pdfText(page, MARGIN, PAGE_HEIGHT - 91, truncate(invoice.title, 70), { size: 10 });
  rightText(page, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 60, invoice.invoiceNumber, { size: 13, bold: true });
  rightText(page, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 80, `Status: ${clientStatus}`, { size: 10, bold: true });
  y = PAGE_HEIGHT - 150;

  const boxHeight = 112;
  const boxGap = 16;
  const leftBoxWidth = 300;
  const rightBoxX = MARGIN + leftBoxWidth + boxGap;
  const rightBoxWidth = CONTENT_WIDTH - leftBoxWidth - boxGap;
  pdfRect(page, MARGIN, y - boxHeight, leftBoxWidth, boxHeight, { fillGray: 0.985, strokeGray: 0.86 });
  pdfRect(page, rightBoxX, y - boxHeight, rightBoxWidth, boxHeight, { fillGray: 0.985, strokeGray: 0.86 });

  pdfText(page, MARGIN + 16, y - 24, "Ditagihkan Kepada", { size: 9, bold: true });
  pdfText(page, MARGIN + 16, y - 44, invoice.client.name, { size: 12, bold: true });
  pdfText(page, MARGIN + 16, y - 61, truncate(invoice.client.companyName || "-", 38), { size: 10 });
  pdfText(page, MARGIN + 16, y - 78, truncate(invoice.client.email, 40), { size: 10 });
  if (invoice.client.phone) {
    pdfText(page, MARGIN + 16, y - 95, truncate(invoice.client.phone, 32), { size: 10 });
  }

  pdfText(page, rightBoxX + 16, y - 24, "Detail Invoice", { size: 9, bold: true });
  pdfText(page, rightBoxX + 16, y - 44, "Issue date", { size: 9 });
  rightText(page, PAGE_WIDTH - MARGIN - 16, y - 44, formatDate(invoice.issueDate), { size: 9, bold: true });
  pdfText(page, rightBoxX + 16, y - 63, "Due date", { size: 9 });
  rightText(page, PAGE_WIDTH - MARGIN - 16, y - 63, formatDate(invoice.dueDate), { size: 9, bold: true });
  pdfText(page, rightBoxX + 16, y - 82, "Total", { size: 9 });
  rightText(page, PAGE_WIDTH - MARGIN - 16, y - 82, formatCurrency(invoice.totalAmount.toString()), { size: 12, bold: true });
  y -= boxHeight + 36;

  const tableX = MARGIN;
  const descX = tableX + 14;
  const qtyRight = tableX + 332;
  const priceRight = tableX + 430;
  const totalRight = PAGE_WIDTH - MARGIN - 14;
  pdfRect(page, tableX, y - 34, CONTENT_WIDTH, 38, { fillGray: 0.94, strokeGray: 0.82 });
  pdfText(page, descX, y - 19, "Rincian Tagihan", { size: 10, bold: true });
  rightText(page, qtyRight, y - 19, "Qty", { size: 10, bold: true });
  rightText(page, priceRight, y - 19, "Harga", { size: 10, bold: true });
  rightText(page, totalRight, y - 19, "Total", { size: 10, bold: true });
  y -= 58;

  for (const item of invoice.items) {
    const lines = wrapText(item.description, 42).slice(0, 2);
    const rowHeight = Math.max(38, 24 + lines.length * 14);
    ensureSpace(rowHeight + 8);
    const textY = y - 6;

    lines.forEach((line, index) => {
      pdfText(page, descX, textY - index * 14, truncate(line, 44), { size: 10 });
    });
    rightText(page, qtyRight, textY, Number(item.quantity.toString()).toLocaleString("id-ID"), { size: 10 });
    rightText(page, priceRight, textY, formatCurrency(item.unitPrice.toString()), { size: 10 });
    rightText(page, totalRight, textY, formatCurrency(item.totalPrice.toString()), { size: 10, bold: true });
    y -= rowHeight;
    pdfLine(page, tableX, y + 14, PAGE_WIDTH - MARGIN, y + 14, 0.92);
  }

  y -= 22;
  ensureSpace(154);
  const summaryX = PAGE_WIDTH - MARGIN - 238;
  const summaryWidth = 238;
  pdfRect(page, summaryX, y - 126, summaryWidth, 126, { fillGray: 0.975, strokeGray: 0.86 });
  const labelX = summaryX + 16;
  const valueX = summaryX + summaryWidth - 16;
  pdfText(page, labelX, y - 24, "Subtotal", { size: 10 });
  rightText(page, valueX, y - 24, formatCurrency(invoice.subtotal.toString()), { size: 10 });
  pdfText(page, labelX, y - 45, "Pajak", { size: 10 });
  rightText(page, valueX, y - 45, formatCurrency(invoice.taxAmount.toString()), { size: 10 });
  pdfText(page, labelX, y - 66, "Diskon", { size: 10 });
  rightText(page, valueX, y - 66, formatCurrency(invoice.discountAmount.toString()), { size: 10 });
  pdfLine(page, labelX, y - 84, valueX, y - 84, 0.78);
  pdfText(page, labelX, y - 108, "Total", { size: 14, bold: true });
  rightText(page, valueX, y - 108, formatCurrency(invoice.totalAmount.toString()), { size: 14, bold: true });

  if (invoice.notes) {
    y -= 156;
    ensureSpace(80);
    pdfText(page, MARGIN, y, "Catatan", { size: 10, bold: true });
    y -= 18;
    const noteLines = invoice.notes
      .split(/\r?\n/)
      .flatMap((line) => wrapText(line, 82))
      .slice(0, 6);
    for (const line of noteLines) {
      pdfText(page, MARGIN, y, truncate(line, 92), { size: 9 });
      y -= 13;
    }
  }

  for (const renderedPage of pages) {
    pdfLine(renderedPage, MARGIN, 56, PAGE_WIDTH - MARGIN, 56, 0.9);
    pdfText(renderedPage, MARGIN, 38, "Invoice dibuat otomatis oleh Invoice DOKU.", { size: 8 });
    rightText(renderedPage, PAGE_WIDTH - MARGIN, 38, invoice.invoiceNumber, { size: 8 });
  }

  return pages;
}

export function generateInvoicePdf(invoice: PdfInvoice) {
  const pages = buildInvoicePages(invoice);
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectStart = 5;
  const kids = pages.map((_, index) => `${pageObjectStart + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  for (let index = 0; index < pages.length; index += 1) {
    const pageObjectId = pageObjectStart + index * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = pages[index].commands.join("\n");
    const streamLength = Buffer.byteLength(stream, "latin1");

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objects.push(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
