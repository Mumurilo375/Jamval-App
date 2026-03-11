import type { Prisma, ReceiptDocument } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type { ReceiptDocumentWithVisitSummary, VisitReceiptSource } from "./receipt.types";

const visitReceiptInclude = {
  client: {
    select: {
      id: true,
      tradeName: true,
      legalName: true,
      documentNumber: true,
      contactName: true,
      phone: true,
      addressLine: true,
      addressCity: true,
      addressState: true,
      addressZipcode: true
    }
  },
  items: {
    orderBy: [{ createdAt: "asc" }]
  },
  receivable: true,
  receiptDocument: true
} satisfies Prisma.VisitInclude;

const receiptDocumentWithVisitSummaryInclude = {
  visit: {
    select: {
      id: true,
      visitCode: true,
      status: true,
      visitedAt: true,
      totalAmount: true,
      receivedAmountOnVisit: true,
      signatureStatus: true,
      signedAt: true,
      client: {
        select: {
          id: true,
          tradeName: true
        }
      }
    }
  }
} satisfies Prisma.ReceiptDocumentInclude;

type UpsertReceiptDocumentInput = {
  visitId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  checksum: string;
  generatedAt: Date;
};

export class ReceiptRepository {
  async findVisitByIdForReceipt(visitId: string, db: DbClient = prisma): Promise<VisitReceiptSource | null> {
    return db.visit.findUnique({
      where: { id: visitId },
      include: visitReceiptInclude
    });
  }

  async findReceiptByVisitId(
    visitId: string,
    db: DbClient = prisma
  ): Promise<ReceiptDocumentWithVisitSummary | null> {
    return db.receiptDocument.findUnique({
      where: { visitId },
      include: receiptDocumentWithVisitSummaryInclude
    });
  }

  async findReceiptById(id: string, db: DbClient = prisma): Promise<ReceiptDocument | null> {
    return db.receiptDocument.findUnique({
      where: { id }
    });
  }

  async upsertByVisit(
    visitId: string,
    data: UpsertReceiptDocumentInput,
    db: DbClient = prisma
  ): Promise<ReceiptDocument> {
    const existing = await db.receiptDocument.findUnique({
      where: { visitId },
      select: { id: true }
    });

    if (existing) {
      return db.receiptDocument.update({
        where: { id: existing.id },
        data: {
          storageKey: data.storageKey,
          fileName: data.fileName,
          mimeType: data.mimeType,
          checksum: data.checksum,
          generatedAt: data.generatedAt
        }
      });
    }

    return db.receiptDocument.create({
      data: {
        visitId,
        storageKey: data.storageKey,
        fileName: data.fileName,
        mimeType: data.mimeType,
        checksum: data.checksum,
        generatedAt: data.generatedAt
      }
    });
  }
}
