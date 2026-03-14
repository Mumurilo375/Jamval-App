import crypto from "node:crypto";
import path from "node:path";

import { VisitStatus } from "@prisma/client";

import { AdminRepository } from "../admin/admin.repository";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import {
  fileExists,
  readStorageFile,
  removeStorageFile,
  writeStorageFile
} from "../../shared/utils/local-storage";
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
    const companyProfile = await this.getCompanyProfile();

    const pdfBuffer = await renderReceiptPdf({
      visit,
      companyProfile,
      issuedAt: generatedAt,
      initialPayment: getInitialPaymentSummary(visit)
    });

    const fileName = `comprovante-acerto-e-reposicao-${visit.visitCode}.pdf`;
    const storageKey = path.posix.join("receipts", "visits", visit.id, fileName);
    const checksum = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    await writeStorageFile(storageKey, pdfBuffer);

    const previousStorageKey = visit.receiptDocument?.storageKey;

    try {
      await this.repository.upsertByVisit(visit.id, {
        visitId: visit.id,
        storageKey,
        fileName,
        mimeType: "application/pdf",
        checksum,
        generatedAt
      });
    } catch (error) {
      await removeStorageFile(storageKey);
      throw error;
    }

    if (previousStorageKey && previousStorageKey !== storageKey) {
      await removeStorageFile(previousStorageKey);
    }

    return this.getByVisitId(visitId);
  }

  async getByVisitId(visitId: string) {
    const visit = await this.repository.findVisitByIdForReceipt(visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: visitId });
    }

    const receiptDocument = await this.repository.findReceiptByVisitId(visitId);

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

    const exists = await fileExists(receiptDocument.storageKey);

    if (!exists) {
      throw new AppError(404, "RECEIPT_FILE_NOT_FOUND", "Receipt PDF file was not found in local storage", {
        receiptDocumentId: id,
        storageKey: receiptDocument.storageKey
      });
    }

    return {
      receiptDocument,
      content: await readStorageFile(receiptDocument.storageKey)
    };
  }

  private async getCompanyProfile() {
    const settings = await this.adminRepository.findCompanyProfileSettings();

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
