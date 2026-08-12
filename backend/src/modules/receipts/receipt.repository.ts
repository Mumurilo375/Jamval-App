import { randomUUID } from "node:crypto";

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
  receivable: {
    include: {
      payments: {
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }]
      }
    }
  }
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

const receiptDocumentDownloadSelect = {
  id: true,
  visitId: true,
  storageKey: true,
  fileName: true,
  mimeType: true,
  checksum: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ReceiptDocumentSelect;

export type ReceiptDocumentForDownload = Prisma.ReceiptDocumentGetPayload<{
  select: typeof receiptDocumentDownloadSelect;
}>;

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

  async findReceiptById(id: string, db: DbClient = prisma): Promise<ReceiptDocumentForDownload | null> {
    return db.receiptDocument.findUnique({
      where: { id },
      select: receiptDocumentDownloadSelect
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
        id: randomUUID(),
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
