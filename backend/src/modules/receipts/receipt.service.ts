import crypto from "node:crypto";
import path from "node:path";

import { VisitStatus } from "@prisma/client";

import { AdminRepository } from "../admin/admin.repository";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import { resolveReceiptCompanyProfile } from "./receipt-company-profile";
import { renderReceiptPdf } from "./receipt-pdf";
import { ReceiptRepository } from "./receipt.repository";

export class ReceiptService {
  constructor(
    private readonly repository = new ReceiptRepository(),
    private readonly adminRepository = new AdminRepository()
  ) {}

  async generateForVisit(visitId: string) {
    const visit = await this.repository.findVisitByIdForReceipt(visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: visitId });
    }

    ensureVisitCanGenerateReceipt(visit.id, visit.status);
    const generatedAt = new Date();
    const { fileName, storageKey, mimeType, checksum } = await this.buildReceiptArtifacts(visit, generatedAt);

    try {
      await this.repository.upsertByVisit(visit.id, {
        visitId: visit.id,
        storageKey,
        fileName,
        mimeType,
        checksum,
        generatedAt
      });

      return this.getByVisitId(visitId);
    } catch {
      return mapVirtualReceiptSummary({
        visit,
        generatedAt,
        fileName,
        mimeType,
        checksum,
        storageKey
      });
    }
  }

  async getByVisitId(visitId: string) {
    const visit = await this.repository.findVisitByIdForReceipt(visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: visitId });
    }

    const receiptDocument = await this.findReceiptByVisitIdBestEffort(visitId);

    if (!receiptDocument) {
      throw new AppError(404, "RECEIPT_DOCUMENT_NOT_FOUND", "Receipt document was not generated yet", {
        visitId
      });
    }

    return mapReceiptSummary(receiptDocument, visit);
  }

  async getDownload(id: string) {
    const receiptDocument = await this.repository.findReceiptById(id);

    if (!receiptDocument) {
      throw new NotFoundError("Receipt document not found", { id });
    }

    const visit = await this.repository.findVisitByIdForReceipt(receiptDocument.visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: receiptDocument.visitId });
    }

    return {
      receiptDocument,
      content: await renderReceiptPdf({
        visit,
        companyProfile: await this.getCompanyProfile(),
        issuedAt: receiptDocument.generatedAt,
        initialPayment: getInitialPaymentSummary(visit)
      })
    };
  }

  async getDownloadByVisit(visitId: string) {
    const visit = await this.repository.findVisitByIdForReceipt(visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: visitId });
    }

    ensureVisitCanGenerateReceipt(visit.id, visit.status);
    const generatedAt = new Date();
    const { fileName, mimeType, pdfBuffer } = await this.buildReceiptArtifacts(visit, generatedAt);

    return {
      fileName,
      mimeType,
      content: pdfBuffer
    };
  }

  private async getCompanyProfile() {
    const settings = await this.findCompanyProfileSettingsBestEffort();

    return resolveReceiptCompanyProfile(
      settings
        ? {
            companyName: settings.companyName,
            document: settings.document,
            phone: settings.phone,
            address: settings.address,
            email: settings.email,
            contactName: settings.contactName
          }
        : null
    );
  }

  private async findCompanyProfileSettingsBestEffort() {
    try {
      return await this.adminRepository.findCompanyProfileSettings();
    } catch {
      return null;
    }
  }

  private async findReceiptByVisitIdBestEffort(visitId: string) {
    try {
      return await this.repository.findReceiptByVisitId(visitId);
    } catch {
      return null;
    }
  }

  private async buildReceiptArtifacts(
    visit: NonNullable<Awaited<ReturnType<ReceiptRepository["findVisitByIdForReceipt"]>>>,
    generatedAt: Date
  ) {
    const pdfBuffer = await renderReceiptPdf({
      visit,
      companyProfile: await this.getCompanyProfile(),
      issuedAt: generatedAt,
      initialPayment: getInitialPaymentSummary(visit)
    });
    const fileName = buildReceiptFileName(visit.visitType, visit.visitCode);
    const storageKey = path.posix.join("receipts", "visits", visit.id, fileName);

    return {
      fileName,
      storageKey,
      mimeType: "application/pdf",
      checksum: crypto.createHash("sha256").update(pdfBuffer).digest("hex"),
      pdfBuffer
    };
  }
}

function ensureVisitCanGenerateReceipt(visitId: string, status: VisitStatus): void {
  if (status === VisitStatus.CANCELLED) {
    throw new AppError(409, "VISIT_NOT_RECEIPTABLE", "Cancelled visits cannot generate receipts", {
      visitId,
      status
    });
  }

  if (status !== VisitStatus.COMPLETED) {
    throw new AppError(409, "VISIT_NOT_RECEIPTABLE", "Only completed visits can generate receipts", {
      visitId,
      status
    });
  }
}

function mapReceiptSummary(
  receiptDocument: Awaited<ReturnType<ReceiptRepository["findReceiptByVisitId"]>>,
  visit: NonNullable<Awaited<ReturnType<ReceiptRepository["findVisitByIdForReceipt"]>>>
) {
  if (!receiptDocument) {
    throw new AppError(500, "RECEIPT_DOCUMENT_ERROR", "Receipt document could not be mapped");
  }

  const initialPayment = getInitialPaymentSummary(visit);

  return {
    id: receiptDocument.id,
    visitId: receiptDocument.visitId,
    storageKey: receiptDocument.storageKey,
    fileName: receiptDocument.fileName,
    mimeType: receiptDocument.mimeType,
    checksum: receiptDocument.checksum,
    generatedAt: receiptDocument.generatedAt,
    createdAt: receiptDocument.createdAt,
    updatedAt: receiptDocument.updatedAt,
    visit: {
      id: visit.id,
      visitCode: visit.visitCode,
      status: visit.status,
      visitedAt: visit.visitedAt,
      totalAmount: visit.totalAmount,
      receivedAmountOnVisit: visit.receivedAmountOnVisit,
      client: visit.client
    },
    initialPayment,
    downloadUrl: `/receipt-documents/${receiptDocument.id}/download`
  };
}

function mapVirtualReceiptSummary(input: {
  visit: NonNullable<Awaited<ReturnType<ReceiptRepository["findVisitByIdForReceipt"]>>>;
  generatedAt: Date;
  fileName: string;
  mimeType: string;
  checksum: string;
  storageKey: string;
}) {
  const initialPayment = getInitialPaymentSummary(input.visit);

  return {
    id: input.visit.id,
    visitId: input.visit.id,
    storageKey: input.storageKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    checksum: input.checksum,
    generatedAt: input.generatedAt,
    createdAt: input.generatedAt,
    updatedAt: input.generatedAt,
    visit: {
      id: input.visit.id,
      visitCode: input.visit.visitCode,
      status: input.visit.status,
      visitedAt: input.visit.visitedAt,
      totalAmount: input.visit.totalAmount,
      receivedAmountOnVisit: input.visit.receivedAmountOnVisit,
      client: input.visit.client
    },
    initialPayment,
    downloadUrl: `/visits/${input.visit.id}/receipt/download`
  };
}

function buildReceiptFileName(visitType: "CONSIGNMENT" | "SALE", visitCode: string): string {
  return visitType === "SALE"
    ? `comprovante-venda-direta-${visitCode}.pdf`
    : `comprovante-acerto-e-reposicao-${visitCode}.pdf`;
}

function getInitialPaymentSummary(
  visit: NonNullable<Awaited<ReturnType<ReceiptRepository["findVisitByIdForReceipt"]>>>
) {
  const payment = visit.receivable?.payments[0];

  if (!payment) {
    return null;
  }

  return {
    paymentMethod: payment.paymentMethod,
    reference: payment.reference ?? null
  };
}
