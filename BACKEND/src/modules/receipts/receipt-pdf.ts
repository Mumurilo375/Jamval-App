import PDFDocument from "pdfkit";

import type { ReceiptCompanyProfile } from "./receipt-company-profile";
import type { VisitReceiptSource } from "./receipt.types";

type PdfDocument = InstanceType<typeof PDFDocument>;
type ReceiptItem = VisitReceiptSource["items"][number];

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
  font?: "Helvetica" | "Helvetica-Bold";
  value: (row: T) => string;
};

const COLORS = {
  ink: "#0f172a",
  muted: "#475569",
  line: "#cbd5e1",
  lineStrong: "#94a3b8"
} as const;

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

  currentY = drawClientBlock(doc, input.visit, currentY + 10);
  currentY = drawSectionLabel(doc, "Itens da venda", currentY + 14);
  currentY = drawTable(
    doc,
    {
      y: currentY + 8,
      rows: input.visit.items,
      columns: saleColumns(),
      continuationPage
    }
  );

  currentY = ensureSectionSpace(doc, currentY, 190, continuationPage);
  currentY = drawFinancialSummary(doc, currentY + 8, {
    totalLabel: "Total",
    totalValue: formatCurrency(amounts.totalAmount),
    receivedLabel: "Valor recebido",
    receivedValue: formatCurrency(amounts.receivedAmount),
    balanceLabel: "Saldo",
    balanceValue: formatCurrency(amounts.pendingAmount)
  });

  currentY = drawPaymentDetails(doc, currentY + 12, input.initialPayment, amounts.receivedAmount);

  if (input.visit.notes) {
    currentY = drawCompactParagraph(doc, "Observações", input.visit.notes, currentY + 12, continuationPage);
  }

  drawSignatureBlocks(doc, currentY + 18);
}

function renderConsignmentReceipt(doc: PdfDocument, input: RenderReceiptPdfInput, amounts: ReceiptAmounts): void {
  const settlementContinuationPage = () => startConsignmentSettlementPage(doc, input, true);
  let currentY = startConsignmentSettlementPage(doc, input, false);

  currentY = drawClientBlock(doc, input.visit, currentY + 10);
  currentY = drawSectionLabel(doc, "Acerto do período", currentY + 14);
  currentY = drawTable(
    doc,
    {
      y: currentY + 8,
      rows: input.visit.items,
      columns: consignmentSettlementColumns(),
      continuationPage: settlementContinuationPage
    }
  );

  currentY = ensureSectionSpace(doc, currentY, 220, settlementContinuationPage);
  currentY = drawFinancialSummary(doc, currentY + 8, {
    totalLabel: "Total geral",
    totalValue: formatCurrency(amounts.totalAmount),
    receivedLabel: "Valor recebido",
    receivedValue: formatCurrency(amounts.receivedAmount),
    balanceLabel: "Saldo",
    balanceValue: formatCurrency(amounts.pendingAmount)
  });

  currentY = drawPaymentDetails(doc, currentY + 12, input.initialPayment, amounts.receivedAmount);

  const occurrences = buildConsignmentOccurrences(input.visit.items);

  if (occurrences.length > 0) {
    currentY = drawCompactList(doc, "Ocorrências registradas", occurrences, currentY + 12, settlementContinuationPage);
  }

  if (input.visit.notes) {
    currentY = drawCompactParagraph(doc, "Observações", input.visit.notes, currentY + 12, settlementContinuationPage);
  }

  drawSignatureBlocks(doc, currentY + 18);

  doc.addPage();

  const baseContinuationPage = () => startConsignmentBasePage(doc, input, true);
  currentY = startConsignmentBasePage(doc, input, false);
  currentY = drawTable(
    doc,
    {
      y: currentY + 12,
      rows: input.visit.items.filter((item) => item.resultingClientQuantity > 0),
      columns: consignmentBaseColumns(),
      emptyMessage: "Nenhum item ficou em consignação para a próxima visita.",
      continuationPage: baseContinuationPage
    }
  );

  currentY = ensureSectionSpace(doc, currentY, 130, baseContinuationPage);
  currentY = drawInstructionLine(
    doc,
    "Este quadro serve como base de conferência para a próxima visita.",
    currentY + 12
  );

  drawSignatureBlocks(doc, currentY + 18);
}

function startSalePage(doc: PdfDocument, input: RenderReceiptPdfInput, compact: boolean): number {
  const currentY = drawDocumentHeader(doc, input.companyProfile, "Comprovante de venda direta", compact);

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
    currentY + 4
  );
}

function startConsignmentSettlementPage(doc: PdfDocument, input: RenderReceiptPdfInput, compact: boolean): number {
  const currentY = drawDocumentHeader(doc, input.companyProfile, "Comprovante de acerto de consignação", compact);

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
    currentY + 4
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
    currentY + 4
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
  let currentY = doc.page.margins.top;

  doc.font("Helvetica-Bold").fontSize(compact ? 15 : 18).fillColor(COLORS.ink).text(companyProfile.name, left, currentY, {
    width
  });
  currentY = doc.y + 2;

  const headerLines = buildCompanyHeaderLines(companyProfile);

  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted);

  for (const line of headerLines) {
    doc.text(line, left, currentY, { width });
    currentY = doc.y + 1;
  }

  currentY += compact ? 10 : 12;

  doc.font("Helvetica-Bold").fontSize(compact ? 13 : 15).fillColor(COLORS.ink).text(title, left, currentY, { width });
  currentY = doc.y + 8;

  doc.moveTo(left, currentY).lineTo(contentRight(doc), currentY).stroke(COLORS.lineStrong);

  return currentY + 4;
}

function drawMetadataBand(doc: PdfDocument, entries: MetadataEntry[], y: number): number {
  const nextY = ensurePageSpace(doc, y, 54);
  const left = contentLeft(doc);
  const totalWidth = contentWidth(doc);
  const columnWidth = totalWidth / entries.length;

  doc.moveTo(left, nextY).lineTo(contentRight(doc), nextY).stroke(COLORS.line);

  let tallest = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const x = left + index * columnWidth;
    const innerWidth = columnWidth - 10;
    const labelHeight = measureTextHeight(doc, entry.label.toUpperCase(), "Helvetica-Bold", 8, innerWidth);
    const valueHeight = measureTextHeight(doc, entry.value, "Helvetica", 10.5, innerWidth);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.muted).text(entry.label.toUpperCase(), x, nextY + 8, {
      width: innerWidth
    });
    doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.ink).text(entry.value, x, nextY + 12 + labelHeight, {
      width: innerWidth
    });

    tallest = Math.max(tallest, 12 + labelHeight + valueHeight);
  }

  const bottomY = nextY + tallest + 8;

  doc.moveTo(left, bottomY).lineTo(contentRight(doc), bottomY).stroke(COLORS.line);

  return bottomY + 6;
}

function drawClientBlock(doc: PdfDocument, visit: VisitReceiptSource, y: number): number {
  const nextY = ensurePageSpace(doc, y, 72);
  const left = contentLeft(doc);
  const width = contentWidth(doc);
  let currentY = drawSectionLabel(doc, "Cliente", nextY);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.ink).text(visit.client.tradeName, left, currentY + 6, {
    width
  });
  currentY = doc.y + 2;

  const contactLine = [visit.client.contactName, visit.client.phone].filter((value): value is string => Boolean(value)).join(" | ");
  const addressLine = formatAddress(
    visit.client.addressLine,
    visit.client.addressCity,
    visit.client.addressState,
    visit.client.addressZipcode
  );

  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted);

  if (contactLine) {
    doc.text(contactLine, left, currentY, { width });
    currentY = doc.y + 1;
  }

  if (addressLine) {
    doc.text(addressLine, left, currentY, { width });
    currentY = doc.y + 1;
  }

  return currentY + 4;
}

function drawSectionLabel(doc: PdfDocument, label: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 18);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), contentLeft(doc), nextY, {
    width: contentWidth(doc)
  });

  return nextY + 12;
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

  for (const row of input.rows) {
    const rowHeight = measureRowHeight(doc, row, input.columns);

    if (currentY + rowHeight > pageBottom(doc)) {
      doc.addPage();
      currentY = drawTableHeader(doc, input.columns, input.continuationPage());
    }

    currentY = drawTableRow(doc, row, input.columns, currentY, rowHeight);
  }

  return currentY + 4;
}

function drawTableHeader<T>(doc: PdfDocument, columns: TableColumn<T>[], y: number): number {
  const nextY = ensurePageSpace(doc, y, 32);
  let x = contentLeft(doc);

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.muted);

  for (const column of columns) {
    doc.text(column.header.toUpperCase(), x + 4, nextY, {
      width: column.width - 8,
      align: column.align ?? "left"
    });
    x += column.width;
  }

  const dividerY = nextY + 14;

  doc.moveTo(contentLeft(doc), dividerY).lineTo(contentRight(doc), dividerY).stroke(COLORS.lineStrong);

  return dividerY + 6;
}

function drawTableRow<T>(
  doc: PdfDocument,
  row: T,
  columns: TableColumn<T>[],
  y: number,
  rowHeight: number
): number {
  let x = contentLeft(doc);

  for (const column of columns) {
    const value = column.value(row);
    doc.font(column.font ?? "Helvetica").fontSize(10).fillColor(COLORS.ink).text(value, x + 4, y, {
      width: column.width - 8,
      align: column.align ?? "left"
    });
    x += column.width;
  }

  const dividerY = y + rowHeight - 8;

  doc.moveTo(contentLeft(doc), dividerY).lineTo(contentRight(doc), dividerY).stroke(COLORS.line);

  return y + rowHeight;
}

function drawEmptyTableMessage(doc: PdfDocument, message: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 40);

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(message, contentLeft(doc), nextY, {
    width: contentWidth(doc)
  });

  const dividerY = doc.y + 8;

  doc.moveTo(contentLeft(doc), dividerY).lineTo(contentRight(doc), dividerY).stroke(COLORS.line);

  return dividerY + 4;
}

function drawFinancialSummary(doc: PdfDocument, y: number, summary: {
  totalLabel: string;
  totalValue: string;
  receivedLabel: string;
  receivedValue: string;
  balanceLabel: string;
  balanceValue: string;
}): number {
  const nextY = ensurePageSpace(doc, y, 90);
  const left = contentLeft(doc);
  const right = contentRight(doc);
  const labelX = right - 210;
  const valueX = right - 90;
  let currentY = nextY;

  doc.moveTo(left, currentY).lineTo(right, currentY).stroke(COLORS.lineStrong);
  currentY += 10;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text("RESUMO FINANCEIRO", left, currentY, {
    width: 180
  });
  currentY += 14;

  currentY = drawSummaryRow(doc, summary.totalLabel, summary.totalValue, labelX, valueX, currentY);
  currentY = drawSummaryRow(doc, summary.receivedLabel, summary.receivedValue, labelX, valueX, currentY);
  currentY = drawSummaryRow(doc, summary.balanceLabel, summary.balanceValue, labelX, valueX, currentY, true);

  return currentY + 4;
}

function drawSummaryRow(
  doc: PdfDocument,
  label: string,
  value: string,
  labelX: number,
  valueX: number,
  y: number,
  emphasize = false
): number {
  const rowY = y + 2;

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink).text(label, labelX, rowY, {
    width: 110,
    align: "right"
  });
  doc.font("Helvetica-Bold").fontSize(emphasize ? 11.5 : 11).fillColor(COLORS.ink).text(value, valueX, rowY - 1, {
    width: 90,
    align: "right"
  });

  return rowY + 18;
}

function drawPaymentDetails(
  doc: PdfDocument,
  y: number,
  payment: RenderReceiptPdfInput["initialPayment"],
  receivedAmount: number
): number {
  if (!payment || receivedAmount <= 0) {
    return y;
  }

  let currentY = drawCompactDetailLine(doc, "Forma de pagamento", formatPaymentMethod(payment.paymentMethod), y);

  if (payment.reference) {
    currentY = drawCompactDetailLine(doc, "Referência", payment.reference, currentY + 2);
  }

  return currentY;
}

function drawCompactDetailLine(doc: PdfDocument, label: string, value: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 20);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text(`${label.toUpperCase()}:`, contentLeft(doc), nextY, {
    continued: true
  });
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(` ${value}`, {
    width: contentWidth(doc)
  });

  return doc.y + 2;
}

function drawCompactParagraph(
  doc: PdfDocument,
  label: string,
  value: string,
  y: number,
  continuationPage?: () => number
): number {
  const neededHeight = measureTextHeight(doc, value, "Helvetica", 9.5, contentWidth(doc)) + 28;
  const nextY = continuationPage ? ensureSectionSpace(doc, y, neededHeight, continuationPage) : ensurePageSpace(doc, y, neededHeight);
  const left = contentLeft(doc);
  const width = contentWidth(doc);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), left, nextY, {
    width
  });
  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(value, left, nextY + 12, {
    width
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

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), left, currentY, {
    width
  });
  currentY += 14;

  for (const value of values) {
    const neededHeight = measureTextHeight(doc, value, "Helvetica", 9.5, width - 12) + 4;

    if (currentY + neededHeight > pageBottom(doc)) {
      if (continuationPage) {
        currentY = ensureSectionSpace(doc, currentY, neededHeight + 18, continuationPage);
      } else {
        doc.addPage();
        currentY = doc.page.margins.top;
      }
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), left, currentY, {
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

function drawInstructionLine(doc: PdfDocument, text: string, y: number): number {
  const nextY = ensurePageSpace(doc, y, 24);

  doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted).text(text, contentLeft(doc), nextY, {
    width: contentWidth(doc)
  });

  return doc.y + 2;
}

function drawSignatureBlocks(doc: PdfDocument, y: number): number {
  const nextY = ensurePageSpace(doc, y, 92);
  const left = contentLeft(doc);
  const columnGap = 36;
  const columnWidth = (contentWidth(doc) - columnGap) / 2;
  const top = Math.max(nextY + 22, pageBottom(doc) - 58);
  const rightColumnX = left + columnWidth + columnGap;

  doc.moveTo(left, top).lineTo(left + columnWidth, top).stroke(COLORS.lineStrong);
  doc.moveTo(rightColumnX, top).lineTo(rightColumnX + columnWidth, top).stroke(COLORS.lineStrong);

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink).text("Assinatura do cliente", left, top + 8, {
    width: columnWidth,
    align: "center"
  });
  doc.text("Assinatura do representante", rightColumnX, top + 8, {
    width: columnWidth,
    align: "center"
  });

  return top + 34;
}

function drawCompactContinuationAnchor(doc: PdfDocument): number {
  return doc.page.margins.top;
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

  return drawCompactContinuationAnchor(doc);
}

function saleColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Produto",
      width: 265,
      value: (item) => item.productSnapshotName
    },
    {
      header: "Quantidade",
      width: 70,
      align: "right",
      value: (item) => String(item.quantitySold > 0 ? item.quantitySold : item.quantityPrevious)
    },
    {
      header: "Preço unit.",
      width: 90,
      align: "right",
      value: (item) => formatCurrency(item.unitPrice)
    },
    {
      header: "Subtotal",
      width: 90,
      align: "right",
      value: (item) => formatCurrency(Number(item.subtotalAmount) || saleQuantity(item) * Number(item.unitPrice))
    }
  ];
}

function consignmentSettlementColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Produto",
      width: 225,
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
      header: "Preço unit.",
      width: 70,
      align: "right",
      value: (item) => formatCurrency(item.unitPrice)
    },
    {
      header: "Total",
      width: 70,
      align: "right",
      value: (item) => formatCurrency(item.subtotalAmount)
    }
  ];
}

function consignmentBaseColumns(): TableColumn<ReceiptItem>[] {
  return [
    {
      header: "Produto",
      width: 315,
      value: (item) => item.productSnapshotName
    },
    {
      header: "Qtd. que ficará",
      width: 100,
      align: "right",
      value: (item) => String(item.resultingClientQuantity)
    },
    {
      header: "Preço unit.",
      width: 100,
      align: "right",
      value: (item) => formatCurrency(item.unitPrice)
    }
  ];
}

function buildCompanyHeaderLines(companyProfile: ReceiptCompanyProfile): string[] {
  const lines = [
    [companyProfile.document ? `CNPJ ${companyProfile.document}` : null, companyProfile.phone ? `Telefone ${companyProfile.phone}` : null]
      .filter((value): value is string => Boolean(value))
      .join(" | "),
    companyProfile.address ?? "",
    [companyProfile.contactName ? `Contato ${companyProfile.contactName}` : null, companyProfile.email ? `E-mail ${companyProfile.email}` : null]
      .filter((value): value is string => Boolean(value))
      .join(" | ")
  ];

  return lines.filter((line) => line.trim().length > 0);
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
    const height = measureTextHeight(doc, column.value(row), column.font ?? "Helvetica", 10, column.width - 8);
    tallest = Math.max(tallest, height);
  }

  return Math.max(24, tallest + 12);
}

function measureTextHeight(
  doc: PdfDocument,
  value: string,
  font: "Helvetica" | "Helvetica-Bold",
  size: number,
  width: number
): number {
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
