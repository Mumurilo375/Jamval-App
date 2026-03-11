import PDFDocument from "pdfkit";

import type { VisitReceiptSource } from "./receipt.types";

type RenderReceiptPdfInput = {
  visit: VisitReceiptSource;
  signatureImageBuffer: Buffer | null;
};

export async function renderReceiptPdf(input: RenderReceiptPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  let currentY = 40;

  currentY = writeSectionTitle(doc, "Comprovante de Visita", currentY);
  currentY = writeLabelValue(doc, "Codigo da visita", input.visit.visitCode, currentY);
  currentY = writeLabelValue(doc, "Data da visita", formatDateTime(input.visit.visitedAt), currentY);
  currentY = writeLabelValue(doc, "Status da visita", input.visit.status, currentY);

  currentY = writeSectionTitle(doc, "Cliente", currentY + 10);
  currentY = writeLabelValue(doc, "Nome fantasia", input.visit.client.tradeName, currentY);
  currentY = writeOptionalLabelValue(doc, "Razao social", input.visit.client.legalName, currentY);
  currentY = writeOptionalLabelValue(doc, "Documento", input.visit.client.documentNumber, currentY);
  currentY = writeOptionalLabelValue(doc, "Contato", input.visit.client.contactName, currentY);
  currentY = writeOptionalLabelValue(doc, "Telefone", input.visit.client.phone, currentY);
  currentY = writeOptionalLabelValue(
    doc,
    "Endereco",
    formatAddress(input.visit.client.addressLine, input.visit.client.addressCity, input.visit.client.addressState, input.visit.client.addressZipcode),
    currentY
  );

  currentY = writeSectionTitle(doc, "Itens", currentY + 10);

  for (const item of input.visit.items) {
    currentY = ensurePageSpace(doc, currentY, 90);
    doc.font("Helvetica-Bold").fontSize(11).text(item.productSnapshotLabel, 40, currentY);
    currentY += 16;
    doc.font("Helvetica").fontSize(10);
    currentY = writeLabelValue(doc, "SKU", item.productSnapshotSku, currentY);
    currentY = writeLabelValue(
      doc,
      "Quantidades",
      `anterior ${item.quantityPrevious} | boa ${item.quantityGoodRemaining} | defeito ${item.quantityDefectiveReturn} | perda ${item.quantityLoss} | reposta ${item.restockedQuantity} | vendida ${item.quantitySold}`,
      currentY
    );
    currentY = writeLabelValue(doc, "Preco unitario", formatCurrency(item.unitPrice), currentY);
    currentY = writeLabelValue(doc, "Subtotal", formatCurrency(item.subtotalAmount), currentY);
    currentY += 6;
  }

  currentY = ensurePageSpace(doc, currentY, 110);
  currentY = writeSectionTitle(doc, "Financeiro", currentY + 10);
  currentY = writeLabelValue(doc, "Total da visita", formatCurrency(input.visit.totalAmount), currentY);
  currentY = writeLabelValue(doc, "Recebido na visita", formatCurrency(input.visit.receivedAmountOnVisit), currentY);

  if (input.visit.receivable) {
    currentY = writeLabelValue(doc, "Status do titulo", input.visit.receivable.status, currentY);
    currentY = writeLabelValue(doc, "Valor original", formatCurrency(input.visit.receivable.originalAmount), currentY);
    currentY = writeLabelValue(doc, "Valor recebido", formatCurrency(input.visit.receivable.amountReceived), currentY);
    currentY = writeLabelValue(
      doc,
      "Valor em aberto",
      formatCurrency(input.visit.receivable.amountOutstanding),
      currentY
    );
    currentY = writeOptionalLabelValue(doc, "Vencimento", formatDate(input.visit.receivable.dueDate), currentY);
  } else {
    currentY = writeLabelValue(doc, "Receivable", "Nao gerado", currentY);
  }

  currentY = ensurePageSpace(doc, currentY, input.signatureImageBuffer ? 180 : 80);
  currentY = writeSectionTitle(doc, "Assinatura", currentY + 10);
  currentY = writeLabelValue(doc, "Status", input.visit.signatureStatus, currentY);

  if (!input.signatureImageBuffer) {
    currentY = writeLabelValue(doc, "Assinatura", "ASSINATURA PENDENTE", currentY);
  } else {
    currentY = writeOptionalLabelValue(doc, "Assinante", input.visit.signatureName, currentY);
    currentY = writeOptionalLabelValue(doc, "Assinado em", formatDateTime(input.visit.signedAt), currentY);
    currentY += 8;
    doc.image(input.signatureImageBuffer, 40, currentY, {
      fit: [220, 100]
    });
    currentY += 110;
  }

  doc.end();

  return finished;
}

function writeSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 30);
  doc.font("Helvetica-Bold").fontSize(14).text(title, 40, nextY);
  return nextY + 20;
}

function writeLabelValue(doc: PDFKit.PDFDocument, label: string, value: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 22);
  doc.font("Helvetica-Bold").fontSize(10).text(`${label}:`, 40, nextY, { continued: true });
  doc.font("Helvetica").text(` ${value}`, { width: 500 });
  return doc.y + 4;
}

function writeOptionalLabelValue(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined, y: number): number {
  if (!value) {
    return y;
  }

  return writeLabelValue(doc, label, value, y);
}

function ensurePageSpace(doc: PDFKit.PDFDocument, y: number, neededHeight: number): number {
  if (y + neededHeight <= doc.page.height - doc.page.margins.bottom) {
    return y;
  }

  doc.addPage();
  return doc.page.margins.top;
}

function formatCurrency(value: unknown): string {
  const numericValue = Number(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numericValue);
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatAddress(
  addressLine: string | null,
  city: string | null,
  state: string | null,
  zipcode: string | null
): string | null {
  const parts = [addressLine, city, state, zipcode].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}
