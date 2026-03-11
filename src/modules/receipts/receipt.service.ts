import crypto from "node:crypto";
import path from "node:path";

import { VisitStatus } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import {
  fileExists,
  readStorageFile,
  removeStorageFile,
  writeStorageFile
} from "../../shared/utils/local-storage";
import { renderReceiptPdf } from "./receipt-pdf";
import { ReceiptRepository } from "./receipt.repository";

export class ReceiptService {
  constructor(private readonly repository = new ReceiptRepository()) {}

  async generateForVisit(visitId: string) {
    const visit = await this.repository.findVisitByIdForReceipt(visitId);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id: visitId });
    }

    ensureVisitCanGenerateReceipt(visit.id, visit.status);

    let signatureImageBuffer: Buffer | null = null;

    if (visit.signatureImageKey) {
      try {
        signatureImageBuffer = await readStorageFile(visit.signatureImageKey);
      } catch (error) {
        if (error instanceof AppError && error.code === "STORAGE_FILE_NOT_FOUND") {
          throw new AppError(500, "SIGNATURE_FILE_NOT_FOUND", "The stored signature image could not be loaded", {
            visitId,
            signatureImageKey: visit.signatureImageKey
          });
        }

        throw error;
      }
    }

    const pdfBuffer = await renderReceiptPdf({
      visit,
      signatureImageBuffer
    });

    const fileName = `receipt-${visit.visitCode}.pdf`;
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
        generatedAt: new Date()
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

    return mapReceiptSummary(receiptDocument);
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

function mapReceiptSummary(receiptDocument: Awaited<ReturnType<ReceiptRepository["findReceiptByVisitId"]>>) {
  if (!receiptDocument) {
    throw new AppError(500, "RECEIPT_DOCUMENT_ERROR", "Receipt document could not be mapped");
  }

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
      id: receiptDocument.visit.id,
      visitCode: receiptDocument.visit.visitCode,
      status: receiptDocument.visit.status,
      visitedAt: receiptDocument.visit.visitedAt,
      totalAmount: receiptDocument.visit.totalAmount,
      receivedAmountOnVisit: receiptDocument.visit.receivedAmountOnVisit,
      signatureStatus: receiptDocument.visit.signatureStatus,
      signedAt: receiptDocument.visit.signedAt,
      client: receiptDocument.visit.client
    },
    downloadUrl: `/receipt-documents/${receiptDocument.id}/download`
  };
}
