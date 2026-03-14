import PDFDocument from "pdfkit";

import type { ReceiptCompanyProfile } from "./receipt-company-profile";
import type { VisitReceiptSource } from "./receipt.types";

type PdfDocument = InstanceType<typeof PDFDocument>;

type RenderReceiptPdfInput = {
  visit: VisitReceiptSource;
  companyProfile: ReceiptCompanyProfile;
  issuedAt: Date;
  initialPayment: {
    paymentMethod: string;
    reference: string | null;
  } | null;
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

  const totalAmount = Number(input.visit.totalAmount);
  const receivedAmount = Number(input.visit.receivedAmountOnVisit);
  const pendingAmount = Math.max(totalAmount - receivedAmount, 0);
  let currentY = 40;

  currentY = drawHeader(doc, input.companyProfile, currentY);
  currentY = writeSectionTitle(doc, "Comprovante de acerto e reposição", currentY + 12);
  currentY = writeLabelValue(doc, "Código da visita", input.visit.visitCode, currentY);
  currentY = writeLabelValue(doc, "Data da visita", formatDateTime(input.visit.visitedAt), currentY);
  currentY = writeLabelValue(doc, "Emitido em", formatDateTime(input.issuedAt), currentY);

  currentY = writeSectionTitle(doc, "Dados da empresa", currentY + 8);
  currentY = writeLabelValue(doc, "Empresa", input.companyProfile.name, currentY);
  currentY = writeOptionalLabelValue(doc, "Documento/CNPJ", input.companyProfile.document, currentY);
  currentY = writeOptionalLabelValue(doc, "Telefone", input.companyProfile.phone, currentY);
  currentY = writeOptionalLabelValue(doc, "Endereço", input.companyProfile.address, currentY);
  currentY = writeOptionalLabelValue(doc, "Contato", input.companyProfile.contactName, currentY);
  currentY = writeOptionalLabelValue(doc, "Email", input.companyProfile.email, currentY);

  currentY = writeSectionTitle(doc, "Dados do cliente", currentY + 8);
  currentY = writeLabelValue(doc, "Cliente", input.visit.client.tradeName, currentY);
  currentY = writeOptionalLabelValue(doc, "Contato", input.visit.client.contactName, currentY);
  currentY = writeOptionalLabelValue(doc, "Telefone", input.visit.client.phone, currentY);
  currentY = writeOptionalLabelValue(
    doc,
    "Endereço",
    formatAddress(
      input.visit.client.addressLine,
      input.visit.client.addressCity,
      input.visit.client.addressState,
      input.visit.client.addressZipcode
    ),
    currentY
  );

  currentY = writeSectionTitle(doc, "Itens da visita", currentY + 8);

  for (const item of input.visit.items) {
    currentY = drawVisitItemBlock(doc, item, currentY);
  }

  currentY = ensurePageSpace(doc, currentY, 160);
  currentY = writeSectionTitle(doc, "Resumo financeiro", currentY + 8);
  currentY = writeLabelValue(doc, "Total a cobrar", formatCurrency(totalAmount), currentY);
  currentY = writeLabelValue(doc, "Valor recebido nesta visita", formatCurrency(receivedAmount), currentY);
  currentY = writeLabelValue(doc, "Saldo pendente após esta visita", formatCurrency(pendingAmount), currentY);

  if (receivedAmount > 0 && input.initialPayment) {
    currentY = writeLabelValue(
      doc,
      "Forma de pagamento nesta visita",
      formatPaymentMethod(input.initialPayment.paymentMethod),
      currentY
    );
    currentY = writeOptionalLabelValue(doc, "Referência do pagamento", input.initialPayment.reference, currentY);
  } else if (receivedAmount === 0) {
    currentY = writeLabelValue(doc, "Recebimento", "Nenhum pagamento recebido no momento da visita", currentY);
  }

  if (input.visit.notes) {
    currentY = writeSectionTitle(doc, "Observações", currentY + 8);
    currentY = writeParagraph(doc, input.visit.notes, currentY);
  }

  currentY = drawSignatureBlocks(doc, currentY + 16);

  doc.end();

  return finished;
}

function writeSectionTitle(doc: PdfDocument, title: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 34);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text(title, 40, nextY);
  return nextY + 20;
}

function writeLabelValue(doc: PdfDocument, label: string, value: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 22);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(`${label}:`, 40, nextY, { continued: true });
  doc.font("Helvetica").fillColor("#0f172a").text(` ${value}`, { width: 500 });
  return doc.y + 4;
}

function writeOptionalLabelValue(doc: PdfDocument, label: string, value: string | null | undefined, y: number): number {
  if (!value) {
    return y;
  }

  return writeLabelValue(doc, label, value, y);
}

function ensurePageSpace(doc: PdfDocument, y: number, neededHeight: number): number {
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

function drawHeader(doc: PdfDocument, companyProfile: ReceiptCompanyProfile, y: number): number {
  const nextY = ensurePageSpace(doc, y, 72);
  doc.roundedRect(40, nextY, 72, 42, 12).fill("#1d4ed8");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("J", 67, nextY + 9, { align: "center", width: 18 });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(18).text(companyProfile.name, 126, nextY + 3);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#475569")
    .text("Comprovante operacional para impressão e assinatura manual.", 126, nextY + 28);
  return nextY + 52;
}

function drawVisitItemBlock(
  doc: PdfDocument,
  item: VisitReceiptSource["items"][number],
  y: number
): number {
  const nextY = ensurePageSpace(doc, y, 150);
  const boxHeight = 132;

  doc.roundedRect(40, nextY, 515, boxHeight, 12).stroke("#d6dde8");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(item.productSnapshotName, 56, nextY + 14, { width: 360 });
  doc.font("Helvetica").fontSize(9).fillColor("#475569").text(item.productSnapshotSku, 56, nextY + 32);

  let blockY = nextY + 50;
  blockY = writeInlineMetric(doc, 56, blockY, "Anterior no cliente", String(item.quantityPrevious));
  blockY = writeInlineMetric(doc, 220, blockY, "Restante na loja", String(item.quantityGoodRemaining));
  blockY = writeInlineMetric(doc, 392, blockY, "Trocas", String(item.quantityDefectiveReturn));

  blockY = writeInlineMetric(doc, 56, blockY + 8, "Vendido", String(item.quantitySold));
  blockY = writeInlineMetric(doc, 220, blockY, "Preço unitário", formatCurrency(item.unitPrice));
  blockY = writeInlineMetric(doc, 392, blockY, "Subtotal da cobrança", formatCurrency(item.subtotalAmount));

  blockY = writeInlineMetric(doc, 56, blockY + 8, "Quantidade reposta", String(item.restockedQuantity));
  writeInlineMetric(doc, 220, blockY, "Novo saldo no cliente", String(item.resultingClientQuantity));

  return nextY + boxHeight + 10;
}

function writeInlineMetric(
  doc: PdfDocument,
  x: number,
  y: number,
  label: string,
  value: string
): number {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(label, x, y);
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(value, x, y + 13);
  return y;
}

function writeParagraph(doc: PdfDocument, value: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 50);
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(value, 40, nextY, {
    width: 515,
    align: "left"
  });
  return doc.y + 6;
}

function drawSignatureBlocks(doc: PdfDocument, y: number): number {
  const nextY = ensurePageSpace(doc, y, 130);
  const top = nextY + 38;

  doc.moveTo(40, top).lineTo(250, top).stroke("#94a3b8");
  doc.moveTo(345, top).lineTo(555, top).stroke("#94a3b8");

  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text("Assinatura do cliente", 40, top + 8, {
    width: 210,
    align: "center"
  });
  doc.text("Assinatura do representante", 345, top + 8, {
    width: 210,
    align: "center"
  });

  return top + 40;
}

function formatPaymentMethod(paymentMethod: string): string {
  if (paymentMethod === "BANK_TRANSFER") {
    return "Transferência";
  }

  if (paymentMethod === "CASH") {
    return "Dinheiro";
  }

  if (paymentMethod === "CARD") {
    return "Cartão";
  }

  if (paymentMethod === "PIX") {
    return "PIX";
  }

  return "Outro";
}
