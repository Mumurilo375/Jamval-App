import PDFDocument from "pdfkit";

import type { ReceiptCompanyProfile } from "./receipt-company-profile";
import type { VisitReceiptSource } from "./receipt.types";

type PdfDocument = InstanceType<typeof PDFDocument>;
type ReceiptItem = VisitReceiptSource["items"][number];
type PdfFont = "Helvetica" | "Helvetica-Bold" | "Helvetica-Oblique";

type RenderReceiptPdfInput = {
  visit: VisitReceiptSource;
  companyProfile: ReceiptCompanyProfile;
  issuedAt: Date;
  initialPayment: {
    paymentMethod: string;
    reference: string | null;
  } | null;
};

type ReceiptAmounts = {
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
};

type MetadataEntry = {
  label: string;
  value: string;
};

type TableColumn<T> = {
  header: string;
  width: number;
  align?: "left" | "right";
  font?: PdfFont;
  size?: number;
  value: (row: T) => string;
};

const COLORS = {
  ink: "#111827",
  muted: "#4b5563",
  subtle: "#6b7280",
  line: "#d1d5db",
  lineSoft: "#e5e7eb",
  lineStrong: "#9ca3af",
  bandFill: "#f5f5f4",
  panelFill: "#fafaf9",
  tableHeaderFill: "#f3f4f6",
  tableStripe: "#fafafa",
  summaryFill: "#f5f5f4",
  signatureFill: "#fafaf9"
} as const;

const SUMMARY_WIDTH = 220;
const SIGNATURE_HEIGHT = 96;

export async function renderReceiptPdf(input: RenderReceiptPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer | Uint8Array) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const amounts = resolveReceiptAmounts(input.visit);

  if (input.visit.visitType === "SALE") {
    renderSaleReceipt(doc, input, amounts);
  } else {
    renderConsignmentReceipt(doc, input, amounts);
  }

  doc.end();

  return finished;
}

function renderSaleReceipt(doc: PdfDocument, input: RenderReceiptPdfInput, amounts: ReceiptAmounts): void {
  const continuationPage = () => startSalePage(doc, input, true);
  let currentY = startSalePage(doc, input, false);

  currentY = drawClientBlock(doc, input.visit, currentY + 12);
  currentY = drawSectionLabel(doc, "Itens da venda", currentY + 18);
  currentY = drawTable(doc, {
    y: currentY + 8,
    rows: input.visit.items,
    columns: saleColumns(),
    continuationPage
  });

  currentY = ensureSectionSpace(doc, currentY + 18, 170, continuationPage);
  currentY = drawFinancialSummary(
    doc,
    currentY,
    {
      title: "Resumo financeiro",
      totalLabel: "Total da venda",
      totalValue: formatCurrency(amounts.totalAmount),
      receivedLabel: "Valor recebido",
      receivedValue: formatCurrency(amounts.receivedAmount),
      balanceLabel: "Saldo",
      balanceValue: formatCurrency(amounts.pendingAmount)
    }
  );

  currentY = drawPaymentDetailsPanel(doc, currentY + 12, input.initialPayment, amounts.receivedAmount);

  if (input.visit.notes) {
    currentY = drawCompactParagraph(doc, "Observações", input.visit.notes, currentY + 14, continuationPage);
  }

  drawSignatureBand(doc, currentY + 22, continuationPage);
}

function renderConsignmentReceipt(doc: PdfDocument, input: RenderReceiptPdfInput, amounts: ReceiptAmounts): void {
  const settlementContinuationPage = () => startConsignmentSettlementPage(doc, input, true);
  let currentY = startConsignmentSettlementPage(doc, input, false);

  currentY = drawClientBlock(doc, input.visit, currentY + 12);
  currentY = drawSectionLabel(doc, "Acerto do período", currentY + 18);
  currentY = drawTable(doc, {
    y: currentY + 8,
    rows: input.visit.items,
    columns: consignmentSettlementColumns(),
    continuationPage: settlementContinuationPage
  });

  const occurrences = buildConsignmentOccurrences(input.visit.items);
  const footerStartY = ensureSectionSpace(doc, currentY + 18, 172, settlementContinuationPage);
  const leftColumnX = contentLeft(doc);
  const leftColumnWidth = contentWidth(doc) - SUMMARY_WIDTH - 18;
  let leftY = footerStartY;
  let rightY = drawFinancialSummary(doc, footerStartY, {
    title: "Resumo financeiro",
    totalLabel: "Total do acerto",
    totalValue: formatCurrency(amounts.totalAmount),
    receivedLabel: "Valor recebido",
    receivedValue: formatCurrency(amounts.receivedAmount),
    balanceLabel: "Saldo",
    balanceValue: formatCurrency(amounts.pendingAmount)
  });

  rightY = drawPaymentDetailsPanel(doc, rightY + 12, input.initialPayment, amounts.receivedAmount);

  if (occurrences.length > 0) {
    leftY = drawFlowList(doc, leftColumnX, leftColumnWidth, "Ocorrências registradas", occurrences, leftY);
  }

  if (input.visit.notes) {
    leftY = drawFlowParagraph(doc, leftColumnX, leftColumnWidth, "Observações", input.visit.notes, leftY + 10);
  }

  currentY = Math.max(leftY, rightY);

  drawSignatureBand(doc, currentY + 20, settlementContinuationPage);

  doc.addPage();

  const baseContinuationPage = () => startConsignmentBasePage(doc, input, true);
  currentY = startConsignmentBasePage(doc, input, false);
  currentY = drawSectionLabel(doc, "Base da próxima visita", currentY + 16);
  currentY = drawTable(doc, {
    y: currentY + 8,
    rows: input.visit.items.filter((item) => item.resultingClientQuantity > 0),
    columns: consignmentBaseColumns(),
    emptyMessage: "Nenhum item ficou em consignação para a próxima visita.",
    continuationPage: baseContinuationPage
  });

  currentY = drawInstructionNote(
    doc,
    "Esta folha deve ser usada como base de conferência na próxima visita.",
    currentY + 16,
    baseContinuationPage
  );

  drawSignatureBand(doc, currentY + 22, baseContinuationPage);
}

function startSalePage(doc: PdfDocument, input: RenderReceiptPdfInput, compact: boolean): number {
  const currentY = drawDocumentHeader(doc, input.companyProfile, "Comprovante de venda", compact);

  return drawMetadataBand(
    doc,
    compact
      ? [
          { label: "Visita", value: input.visit.visitCode },
          { label: "Cliente", value: input.visit.client.tradeName },
          { label: "Data", value: formatDate(input.visit.visitedAt) }
        ]
      : [
          { label: "Visita", value: input.visit.visitCode },
          { label: "Data da venda", value: formatDateTime(input.visit.visitedAt) },
          { label: "Emitido em", value: formatDateTime(input.issuedAt) }
        ],
    currentY + 2
  );
}

function startConsignmentSettlementPage(doc: PdfDocument, input: RenderReceiptPdfInput, compact: boolean): number {
  const currentY = drawDocumentHeader(doc, input.companyProfile, "Comprovante de acerto e reposição", compact);

  return drawMetadataBand(
    doc,
    compact
      ? [
          { label: "Visita", value: input.visit.visitCode },
          { label: "Cliente", value: input.visit.client.tradeName },
          { label: "Data", value: formatDate(input.visit.visitedAt) }
        ]
      : [
          { label: "Visita", value: input.visit.visitCode },
          { label: "Data da visita", value: formatDateTime(input.visit.visitedAt) },
          { label: "Emitido em", value: formatDateTime(input.issuedAt) }
        ],
    currentY + 2
  );
}

function startConsignmentBasePage(doc: PdfDocument, input: RenderReceiptPdfInput, compact: boolean): number {
  const currentY = drawDocumentHeader(doc, input.companyProfile, "Base da próxima visita", compact);

  return drawMetadataBand(
    doc,
    [
      { label: "Cliente", value: input.visit.client.tradeName },
      { label: "Data da visita", value: formatDate(input.visit.visitedAt) },
      { label: "Visita", value: input.visit.visitCode }
    ],
    currentY + 2
  );
}

function drawDocumentHeader(
  doc: PdfDocument,
  companyProfile: ReceiptCompanyProfile,
  title: string,
  compact: boolean
): number {
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  const currentY = doc.page.margins.top;

  doc.font("Helvetica-Bold").fontSize(compact ? 10 : 10.5).fillColor(COLORS.muted).text(companyProfile.name, left, currentY, {
    width
  });

  let infoY = doc.y + 2;
  const headerLines = buildCompanyHeaderLines(companyProfile);

  doc.font("Helvetica").fontSize(compact ? 8.3 : 8.7).fillColor(COLORS.subtle);

  for (const line of headerLines) {
    doc.text(line, left, infoY, { width });
    infoY = doc.y + 1;
  }

  const titleY = infoY + (compact ? 9 : 12);

  doc.font("Helvetica-Bold").fontSize(compact ? 16 : 20).fillColor(COLORS.ink).text(title, left, titleY, {
    width
  });

  const dividerY = doc.y + 6;

  doc.lineWidth(1.2).moveTo(left, dividerY).lineTo(contentRight(doc), dividerY).stroke(COLORS.lineStrong);

  return dividerY + 8;
}

function drawMetadataBand(doc: PdfDocument, entries: MetadataEntry[], y: number): number {
  const left = contentLeft(doc);
  const totalWidth = contentWidth(doc);
  const columnWidth = totalWidth / entries.length;
  const paddingX = 12;
  const paddingTop = 8;
  const paddingBottom = 10;

  let tallest = 0;

  for (const entry of entries) {
    const innerWidth = columnWidth - paddingX * 2;
    const labelHeight = measureTextHeight(doc, entry.label.toUpperCase(), "Helvetica-Bold", 7.8, innerWidth);
    const valueHeight = measureTextHeight(doc, entry.value, "Helvetica-Bold", 10.4, innerWidth);
    tallest = Math.max(tallest, labelHeight + valueHeight);
  }

  const bandHeight = paddingTop + tallest + paddingBottom;
  const nextY = ensurePageSpace(doc, y, bandHeight + 4);

  doc.rect(left, nextY, totalWidth, bandHeight).fill(COLORS.bandFill);
  doc.moveTo(left, nextY).lineTo(contentRight(doc), nextY).stroke(COLORS.lineStrong);
  doc.moveTo(left, nextY + bandHeight).lineTo(contentRight(doc), nextY + bandHeight).stroke(COLORS.lineStrong);

  let x = left;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const innerWidth = columnWidth - paddingX * 2;

    if (index > 0) {
      doc.moveTo(x, nextY + 8).lineTo(x, nextY + bandHeight - 8).stroke(COLORS.line);
    }

    doc.font("Helvetica-Bold").fontSize(7.8).fillColor(COLORS.subtle).text(entry.label.toUpperCase(), x + paddingX, nextY + paddingTop, {
      width: innerWidth
    });

    doc.font("Helvetica-Bold").fontSize(10.4).fillColor(COLORS.ink).text(entry.value, x + paddingX, nextY + paddingTop + 12, {
      width: innerWidth
    });

    x += columnWidth;
  }

  return nextY + bandHeight + 10;
}

function drawClientBlock(doc: PdfDocument, visit: VisitReceiptSource, y: number): number {
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  const innerX = left + 12;
  const innerWidth = width - 24;
  const contactLine = [visit.client.contactName, visit.client.phone].filter((value): value is string => Boolean(value)).join(" | ");
  const addressLine = formatAddress(
    visit.client.addressLine,
    visit.client.addressCity,
    visit.client.addressState,
    visit.client.addressZipcode
  );
  const detailLines = [contactLine, addressLine].filter((value): value is string => Boolean(value));

  const titleHeight = measureTextHeight(doc, "CLIENTE", "Helvetica-Bold", 8, innerWidth);
  const nameHeight = measureTextHeight(doc, visit.client.tradeName, "Helvetica-Bold", 12.5, innerWidth);
  const detailsHeight = detailLines.reduce(
    (total, line) => total + measureTextHeight(doc, line, "Helvetica", 9.3, innerWidth) + 2,
    0
  );
  const panelHeight = 12 + titleHeight + 6 + nameHeight + (detailLines.length > 0 ? 4 + detailsHeight : 0) + 10;
  const nextY = ensurePageSpace(doc, y, panelHeight + 4);

  doc.rect(left, nextY, width, panelHeight).fill(COLORS.panelFill);
  doc.rect(left, nextY, width, panelHeight).stroke(COLORS.line);

  let currentY = nextY + 10;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.subtle).text("CLIENTE", innerX, currentY, {
    width: innerWidth
  });
  currentY = doc.y + 5;

  doc.font("Helvetica-Bold").fontSize(12.5).fillColor(COLORS.ink).text(visit.client.tradeName, innerX, currentY, {
    width: innerWidth
  });
  currentY = doc.y + 4;

  doc.font("Helvetica").fontSize(9.3).fillColor(COLORS.muted);

  for (const line of detailLines) {
    doc.text(line, innerX, currentY, { width: innerWidth });
    currentY = doc.y + 2;
  }

  return nextY + panelHeight + 6;
}

function drawSectionLabel(doc: PdfDocument, label: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 18);
  const left = contentLeft(doc);
  const right = contentRight(doc);

  doc.font("Helvetica-Bold").fontSize(8.2).fillColor(COLORS.subtle).text(label.toUpperCase(), left, nextY, {
    width: 180
  });

  const labelWidth = doc.widthOfString(label.toUpperCase());
  const lineStart = Math.min(left + labelWidth + 12, right - 20);

  doc.moveTo(lineStart, nextY + 6).lineTo(right, nextY + 6).stroke(COLORS.line);

  return nextY + 14;
}

function drawTable<T>(doc: PdfDocument, input: {
  y: number;
  rows: T[];
  columns: TableColumn<T>[];
  continuationPage: () => number;
  emptyMessage?: string;
}): number {
  let currentY = drawTableHeader(doc, input.columns, input.y);

  if (input.rows.length === 0) {
    return drawEmptyTableMessage(doc, input.emptyMessage ?? "Nenhum item para exibir.", currentY);
  }

  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    const rowHeight = measureRowHeight(doc, row, input.columns);

    if (currentY + rowHeight > pageBottom(doc)) {
      doc.addPage();
      currentY = drawTableHeader(doc, input.columns, input.continuationPage());
    }

    currentY = drawTableRow(doc, row, input.columns, currentY, rowHeight, index);
  }

  return currentY + 4;
}

function drawTableHeader<T>(doc: PdfDocument, columns: TableColumn<T>[], y: number): number {
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  const paddingX = 10;
  const paddingTop = 8;
  const paddingBottom = 8;

  let tallest = 0;

  for (const column of columns) {
    tallest = Math.max(
      tallest,
      measureTextHeight(doc, column.header.toUpperCase(), "Helvetica-Bold", 7.8, column.width - paddingX * 2)
    );
  }

  const headerHeight = paddingTop + tallest + paddingBottom;
  const nextY = ensurePageSpace(doc, y, headerHeight + 4);
  let x = left;

  doc.rect(left, nextY, width, headerHeight).fill(COLORS.tableHeaderFill);
  doc.rect(left, nextY, width, headerHeight).stroke(COLORS.lineStrong);

  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];

    if (index > 0) {
      doc.moveTo(x, nextY).lineTo(x, nextY + headerHeight).stroke(COLORS.line);
    }

    doc.font("Helvetica-Bold").fontSize(7.8).fillColor(COLORS.subtle).text(column.header.toUpperCase(), x + paddingX, nextY + paddingTop, {
      width: column.width - paddingX * 2,
      align: column.align ?? "left"
    });

    x += column.width;
  }

  return nextY + headerHeight;
}

function drawTableRow<T>(
  doc: PdfDocument,
  row: T,
  columns: TableColumn<T>[],
  y: number,
  rowHeight: number,
  index: number
): number {
  const left = contentLeft(doc);
  const paddingX = 10;
  const paddingTop = 7;
  let x = left;

  if (index % 2 === 1) {
    doc.rect(left, y, contentWidth(doc), rowHeight).fill(COLORS.tableStripe);
  }

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];

    if (columnIndex > 0) {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke(COLORS.lineSoft);
    }

    doc
      .font(column.font ?? "Helvetica")
      .fontSize(column.size ?? 10)
      .fillColor(COLORS.ink)
      .text(column.value(row), x + paddingX, y + paddingTop, {
        width: column.width - paddingX * 2,
        align: column.align ?? "left"
      });

    x += column.width;
  }

  doc.moveTo(left, y + rowHeight).lineTo(contentRight(doc), y + rowHeight).stroke(COLORS.lineSoft);

  return y + rowHeight;
}

function drawEmptyTableMessage(doc: PdfDocument, message: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 48);

  doc.rect(contentLeft(doc), nextY, contentWidth(doc), 42).fill(COLORS.panelFill);
  doc.rect(contentLeft(doc), nextY, contentWidth(doc), 42).stroke(COLORS.line);
  doc.font("Helvetica").fontSize(9.8).fillColor(COLORS.muted).text(message, contentLeft(doc) + 12, nextY + 13, {
    width: contentWidth(doc) - 24
  });

  return nextY + 48;
}

function drawFinancialSummary(
  doc: PdfDocument,
  y: number,
  summary: {
    title: string;
    totalLabel: string;
    totalValue: string;
    receivedLabel: string;
    receivedValue: string;
    balanceLabel: string;
    balanceValue: string;
  }
): number {
  const blockHeight = 104;
  const nextY = ensurePageSpace(doc, y, blockHeight + 4);
  const x = contentRight(doc) - SUMMARY_WIDTH;

  doc.rect(x, nextY, SUMMARY_WIDTH, blockHeight).fill(COLORS.summaryFill);
  doc.rect(x, nextY, SUMMARY_WIDTH, blockHeight).stroke(COLORS.lineStrong);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.subtle).text(summary.title.toUpperCase(), x + 14, nextY + 10, {
    width: SUMMARY_WIDTH - 28
  });

  let currentY = nextY + 26;
  currentY = drawSummaryRow(doc, summary.totalLabel, summary.totalValue, x, currentY, true);
  currentY = drawSummaryRow(doc, summary.receivedLabel, summary.receivedValue, x, currentY);
  currentY = drawSummaryRow(doc, summary.balanceLabel, summary.balanceValue, x, currentY, true, true);

  return nextY + blockHeight;
}

function drawSummaryRow(
  doc: PdfDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  emphasize = false,
  finalRow = false
): number {
  const rowHeight = 22;
  const labelX = x + 14;
  const valueX = x + 114;
  const valueFontSize = finalRow ? 13 : emphasize ? 12.6 : 11.2;

  doc.font("Helvetica").fontSize(9.8).fillColor(COLORS.ink).text(label, labelX, y + 5, {
    width: 92
  });
  doc.font("Helvetica-Bold").fontSize(valueFontSize).fillColor(COLORS.ink).text(value, valueX, y + 3, {
    width: 92,
    align: "right"
  });

  if (!finalRow) {
    doc.moveTo(x + 14, y + rowHeight).lineTo(x + SUMMARY_WIDTH - 14, y + rowHeight).stroke(COLORS.line);
  }

  return y + rowHeight;
}

function drawPaymentDetailsPanel(
  doc: PdfDocument,
  y: number,
  payment: RenderReceiptPdfInput["initialPayment"],
  receivedAmount: number
): number {
  if (!payment || receivedAmount <= 0) {
    return y;
  }

  const rowCount = payment.reference ? 2 : 1;
  const blockHeight = 28 + rowCount * 16;
  const nextY = ensurePageSpace(doc, y, blockHeight + 4);
  const x = contentRight(doc) - SUMMARY_WIDTH;

  doc.rect(x, nextY, SUMMARY_WIDTH, blockHeight).fill(COLORS.panelFill);
  doc.rect(x, nextY, SUMMARY_WIDTH, blockHeight).stroke(COLORS.line);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.subtle).text("PAGAMENTO", x + 14, nextY + 10, {
    width: SUMMARY_WIDTH - 28
  });

  let currentY = nextY + 20;
  currentY = drawCompactDetailRow(doc, x, currentY, "Forma de pagamento", formatPaymentMethod(payment.paymentMethod));

  if (payment.reference) {
    currentY = drawCompactDetailRow(doc, x, currentY, "Referência", payment.reference);
  }

  return nextY + blockHeight;
}

function drawCompactDetailRow(doc: PdfDocument, x: number, y: number, label: string, value: string): number {
  doc.font("Helvetica-Bold").fontSize(7.8).fillColor(COLORS.subtle).text(label.toUpperCase(), x + 14, y + 2, {
    width: 96
  });
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(value, x + 118, y + 2, {
    width: SUMMARY_WIDTH - 132,
    align: "right"
  });

  return y + 16;
}

function drawCompactParagraph(
  doc: PdfDocument,
  label: string,
  value: string,
  y: number,
  continuationPage?: () => number
): number {
  const neededHeight = measureTextHeight(doc, value, "Helvetica", 9.5, contentWidth(doc)) + 30;
  const nextY = continuationPage ? ensureSectionSpace(doc, y, neededHeight, continuationPage) : ensurePageSpace(doc, y, neededHeight);
  const left = contentLeft(doc);

  doc.font("Helvetica-Bold").fontSize(8.4).fillColor(COLORS.subtle).text(label.toUpperCase(), left, nextY, {
    width: contentWidth(doc)
  });
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(value, left, nextY + 12, {
    width: contentWidth(doc)
  });

  return doc.y + 2;
}

function drawCompactList(
  doc: PdfDocument,
  label: string,
  values: string[],
  y: number,
  continuationPage?: () => number
): number {
  const nextY = continuationPage ? ensureSectionSpace(doc, y, 40, continuationPage) : ensurePageSpace(doc, y, 40);
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  let currentY = nextY;

  doc.font("Helvetica-Bold").fontSize(8.4).fillColor(COLORS.subtle).text(label.toUpperCase(), left, currentY, {
    width
  });
  currentY += 14;

  for (const value of values) {
    const neededHeight = measureTextHeight(doc, value, "Helvetica", 9.5, width - 12) + 4;

    if (currentY + neededHeight > pageBottom(doc)) {
      currentY = continuationPage ? ensureSectionSpace(doc, currentY, neededHeight + 18, continuationPage) : ensurePageSpace(doc, currentY, neededHeight + 18);
      doc.font("Helvetica-Bold").fontSize(8.4).fillColor(COLORS.subtle).text(label.toUpperCase(), left, currentY, {
        width
      });
      currentY += 14;
    }

    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(`- ${value}`, left, currentY, {
      width
    });
    currentY = doc.y + 2;
  }

  return currentY;
}

function drawInstructionNote(
  doc: PdfDocument,
  text: string,
  y: number,
  continuationPage?: () => number
): number {
  const noteHeight = 46;
  const nextY = continuationPage ? ensureSectionSpace(doc, y, noteHeight, continuationPage) : ensurePageSpace(doc, y, noteHeight);
  const left = contentLeft(doc);
  const width = contentWidth(doc);

  doc.rect(left, nextY, width, noteHeight).fill(COLORS.panelFill);
  doc.rect(left, nextY, width, noteHeight).stroke(COLORS.line);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.subtle).text("USO DESTA FOLHA", left + 12, nextY + 9, {
    width: width - 24
  });
  doc.font("Helvetica").fontSize(9.4).fillColor(COLORS.ink).text(text, left + 12, nextY + 22, {
    width: width - 24
  });

  return nextY + noteHeight;
}

function drawFlowParagraph(doc: PdfDocument, x: number, width: number, label: string, value: string, y: number): number {
  doc.font("Helvetica-Bold").fontSize(8.4).fillColor(COLORS.subtle).text(label.toUpperCase(), x, y, {
    width
  });
  doc.font("Helvetica").fontSize(9.4).fillColor(COLORS.ink).text(value, x, y + 12, {
    width
  });

  return doc.y + 2;
}

function drawFlowList(doc: PdfDocument, x: number, width: number, label: string, values: string[], y: number): number {
  let currentY = y;

  doc.font("Helvetica-Bold").fontSize(8.4).fillColor(COLORS.subtle).text(label.toUpperCase(), x, currentY, {
    width
  });
  currentY += 14;

  for (const value of values) {
    doc.font("Helvetica").fontSize(9.4).fillColor(COLORS.ink).text(`- ${value}`, x, currentY, {
      width
    });
    currentY = doc.y + 2;
  }

  return currentY;
}

function drawSignatureBand(doc: PdfDocument, y: number, continuationPage?: () => number): number {
  const nextY = continuationPage ? ensureSectionSpace(doc, y, SIGNATURE_HEIGHT, continuationPage) : ensurePageSpace(doc, y, SIGNATURE_HEIGHT);
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  const columnGap = 38;
  const columnWidth = (width - columnGap - 24) / 2;
  const bandTop = Math.max(nextY + 4, pageBottom(doc) - SIGNATURE_HEIGHT + 4);
  const lineY = bandTop + 46;
  const leftLineX = left + 12;
  const rightLineX = leftLineX + columnWidth + columnGap;

  doc.rect(left, bandTop, width, SIGNATURE_HEIGHT - 8).fill(COLORS.signatureFill);
  doc.moveTo(left, bandTop).lineTo(contentRight(doc), bandTop).stroke(COLORS.lineStrong);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.subtle).text("ASSINATURAS", left + 12, bandTop + 9, {
    width: width - 24
  });

  doc.lineWidth(1).moveTo(leftLineX, lineY).lineTo(leftLineX + columnWidth, lineY).stroke(COLORS.lineStrong);
  doc.moveTo(rightLineX, lineY).lineTo(rightLineX + columnWidth, lineY).stroke(COLORS.lineStrong);

  doc.font("Helvetica").fontSize(9.3).fillColor(COLORS.ink).text("Assinatura do cliente", leftLineX, lineY + 7, {
    width: columnWidth,
    align: "center"
  });
  doc.text("Assinatura do representante", rightLineX, lineY + 7, {
    width: columnWidth,
    align: "center"
  });

  return bandTop + SIGNATURE_HEIGHT;
}

function ensureSectionSpace(doc: PdfDocument, y: number, neededHeight: number, continuationPage: () => number): number {
  if (y + neededHeight <= pageBottom(doc)) {
    return y;
  }

  doc.addPage();

  return continuationPage();
}

function ensurePageSpace(doc: PdfDocument, y: number, neededHeight: number): number {
  if (y + neededHeight <= pageBottom(doc)) {
    return y;
  }

  doc.addPage();

  return doc.page.margins.top;
}

function saleColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Produto",
      width: 260,
      font: "Helvetica-Bold",
      size: 10.3,
      value: (item) => item.productSnapshotName
    },
    {
      header: "Quantidade",
      width: 75,
      align: "right",
      value: (item) => String(item.quantitySold > 0 ? item.quantitySold : item.quantityPrevious)
    },
    {
      header: "Preço unitário",
      width: 85,
      align: "right",
      value: (item) => formatCurrency(item.unitPrice)
    },
    {
      header: "Subtotal",
      width: 95,
      align: "right",
      font: "Helvetica-Bold",
      size: 10.3,
      value: (item) => formatCurrency(Number(item.subtotalAmount) || saleQuantity(item) * Number(item.unitPrice))
    }
  ];
}

function consignmentSettlementColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Descrição",
      width: 225,
      font: "Helvetica-Bold",
      size: 10.2,
      value: (item) => item.productSnapshotName
    },
    {
      header: "Qtd. anterior",
      width: 75,
      align: "right",
      value: (item) => String(item.quantityPrevious)
    },
    {
      header: "Qtd. vendida",
      width: 75,
      align: "right",
      value: (item) => String(item.quantitySold)
    },
    {
      header: "Preço unitário",
      width: 70,
      align: "right",
      value: (item) => formatCurrency(item.unitPrice)
    },
    {
      header: "Total",
      width: 70,
      align: "right",
      font: "Helvetica-Bold",
      size: 10.3,
      value: (item) => formatCurrency(item.subtotalAmount)
    }
  ];
}

function consignmentBaseColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Produto",
      width: 305,
      font: "Helvetica-Bold",
      size: 10.2,
      value: (item) => item.productSnapshotName
    },
    {
      header: "Qtd. que ficará",
      width: 110,
      align: "right",
      value: (item) => String(item.resultingClientQuantity)
    },
    {
      header: "Preço unitário",
      width: 100,
      align: "right",
      font: "Helvetica-Bold",
      size: 10.2,
      value: (item) => formatCurrency(item.unitPrice)
    }
  ];
}

function buildCompanyHeaderLines(companyProfile: ReceiptCompanyProfile): string[] {
  const firstLine = [
    companyProfile.document ? `CNPJ ${companyProfile.document}` : null,
    companyProfile.phone ? `Telefone ${companyProfile.phone}` : null
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");

  const secondLine = [
    companyProfile.address,
    companyProfile.contactName ? `Contato ${companyProfile.contactName}` : null,
    companyProfile.email ? `E-mail ${companyProfile.email}` : null
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");

  return [firstLine, secondLine].filter((line) => line.trim().length > 0);
}

function buildConsignmentOccurrences(items: ReceiptItem[]): string[] {
  return items
    .map((item) => {
      const details = [
        item.quantityDefectiveReturn > 0 ? `devolução com defeito ${item.quantityDefectiveReturn}` : null,
        item.quantityLoss > 0 ? `perda ${item.quantityLoss}` : null,
        item.notes ? item.notes.trim() : null
      ].filter((value): value is string => Boolean(value));

      if (details.length === 0) {
        return null;
      }

      return `${item.productSnapshotName}: ${details.join(" | ")}`;
    })
    .filter((value): value is string => Boolean(value));
}

function resolveReceiptAmounts(visit: VisitReceiptSource): ReceiptAmounts {
  const totalAmount = Number(visit.totalAmount);
  const receivedAmount = Number(visit.receivedAmountOnVisit);

  return {
    totalAmount,
    receivedAmount,
    pendingAmount: Math.max(totalAmount - receivedAmount, 0)
  };
}

function measureRowHeight<T>(doc: PdfDocument, row: T, columns: TableColumn<T>[]): number {
  let tallest = 0;

  for (const column of columns) {
    const height = measureTextHeight(
      doc,
      column.value(row),
      column.font ?? "Helvetica",
      column.size ?? 10,
      column.width - 20
    );
    tallest = Math.max(tallest, height);
  }

  return Math.max(28, tallest + 14);
}

function measureTextHeight(doc: PdfDocument, value: string, font: PdfFont, size: number, width: number): number {
  doc.font(font).fontSize(size);

  return doc.heightOfString(value || "-", { width });
}

function saleQuantity(item: ReceiptItem): number {
  return item.quantitySold > 0 ? item.quantitySold : item.quantityPrevious;
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
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

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
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

function contentLeft(doc: PdfDocument): number {
  return doc.page.margins.left;
}

function contentRight(doc: PdfDocument): number {
  return doc.page.width - doc.page.margins.right;
}

function contentWidth(doc: PdfDocument): number {
  return contentRight(doc) - contentLeft(doc);
}

function pageBottom(doc: PdfDocument): number {
  return doc.page.height - doc.page.margins.bottom;
}
