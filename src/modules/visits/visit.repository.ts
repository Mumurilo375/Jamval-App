import {
  Prisma,
  type ClientProduct,
  type Product,
  type SignatureStatus,
  type Visit,
  type VisitItem
} from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type {
  DraftVisitComputedItem,
  UpdateVisitInput,
  VisitListQuery,
  VisitWithItems
} from "./visit.types";

const visitWithItemsInclude = {
  items: {
    orderBy: [{ createdAt: "asc" }]
  }
} satisfies Prisma.VisitInclude;

export class VisitRepository {
  async create(data: Prisma.VisitUncheckedCreateInput, db: DbClient = prisma): Promise<Visit> {
    return db.visit.create({ data });
  }

  async findById(id: string, db: DbClient = prisma): Promise<Visit | null> {
    return db.visit.findUnique({ where: { id } });
  }

  async findByIdWithItems(id: string, db: DbClient = prisma): Promise<VisitWithItems | null> {
    return db.visit.findUnique({
      where: { id },
      include: visitWithItemsInclude
    });
  }

  async list(filters: VisitListQuery, db: DbClient = prisma): Promise<Visit[]> {
    const where: Prisma.VisitWhereInput = {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            visitedAt: {
              ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: endOfDay(filters.dateTo) } : {})
            }
          }
        : {})
    };

    return db.visit.findMany({
      where,
      orderBy: [{ visitedAt: "desc" }]
    });
  }

  async updateMetadata(id: string, data: UpdateVisitInput, db: DbClient = prisma): Promise<Visit> {
    return db.visit.update({
      where: { id },
      data
    });
  }

  async updateSignature(
    id: string,
    data: {
      signatureStatus: SignatureStatus;
      signatureName: string | null;
      signatureImageKey: string | null;
      signedAt: Date | null;
    },
    db: DbClient = prisma
  ): Promise<Visit> {
    return db.visit.update({
      where: { id },
      data
    });
  }

  async cancel(id: string, db: DbClient = prisma): Promise<Visit> {
    return db.visit.update({
      where: { id },
      data: {
        status: "CANCELLED"
      }
    });
  }

  async findClientProductById(id: string, db: DbClient = prisma): Promise<ClientProduct | null> {
    return db.clientProduct.findUnique({ where: { id } });
  }

  async findClientProductByClientAndProduct(
    clientId: string,
    productId: string,
    db: DbClient = prisma
  ): Promise<ClientProduct | null> {
    return db.clientProduct.findUnique({
      where: {
        clientId_productId: {
          clientId,
          productId
        }
      }
    });
  }

  async findClientProductsByIds(ids: string[], db: DbClient = prisma): Promise<ClientProduct[]> {
    if (ids.length === 0) {
      return [];
    }

    return db.clientProduct.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  }

  async findProductById(id: string, db: DbClient = prisma): Promise<Product | null> {
    return db.product.findUnique({ where: { id } });
  }

  async findItemById(itemId: string, db: DbClient = prisma): Promise<VisitItem | null> {
    return db.visitItem.findUnique({ where: { id: itemId } });
  }

  async upsertItemByProduct(
    visitId: string,
    productId: string,
    data: DraftVisitComputedItem,
    db: DbClient = prisma
  ): Promise<VisitItem> {
    return db.visitItem.upsert({
      where: {
        visitId_productId: {
          visitId,
          productId
        }
      },
      create: {
        visitId,
        ...data
      },
      update: data
    });
  }

  async updateItem(itemId: string, data: DraftVisitComputedItem, db: DbClient = prisma): Promise<VisitItem> {
    return db.visitItem.update({
      where: { id: itemId },
      data
    });
  }

  async updateItemComputedFields(
    itemId: string,
    data: Pick<Prisma.VisitItemUncheckedUpdateInput, "quantitySold" | "subtotalAmount" | "resultingClientQuantity">,
    db: DbClient = prisma
  ): Promise<VisitItem> {
    return db.visitItem.update({
      where: { id: itemId },
      data
    });
  }

  async deleteItem(itemId: string, db: DbClient = prisma): Promise<void> {
    await db.visitItem.delete({
      where: { id: itemId }
    });
  }

  async aggregateVisitTotal(visitId: string, db: DbClient = prisma): Promise<Prisma.Decimal> {
    const result = await db.visitItem.aggregate({
      where: { visitId },
      _sum: {
        subtotalAmount: true
      }
    });

    return result._sum.subtotalAmount ?? new Prisma.Decimal(0);
  }

  async updateTotalAmount(visitId: string, totalAmount: Prisma.Decimal, db: DbClient = prisma): Promise<Visit> {
    return db.visit.update({
      where: { id: visitId },
      data: {
        totalAmount
      }
    });
  }

  async markAsCompleted(
    visitId: string,
    totalAmount: Prisma.Decimal,
    completedAt: Date,
    db: DbClient = prisma
  ): Promise<number> {
    const result = await db.visit.updateMany({
      where: {
        id: visitId,
        status: "DRAFT"
      },
      data: {
        status: "COMPLETED",
        totalAmount,
        completedAt
      }
    });

    return result.count;
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
