import type { Prisma, Receivable, ReceivableStatus } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type { ReceivableDetailItem, ReceivableListItem, ReceivableListQuery } from "./receivable.types";

const receivableListInclude = {
  client: {
    select: {
      id: true,
      tradeName: true
    }
  },
  visit: {
    select: {
      id: true,
      visitCode: true,
      visitedAt: true,
      status: true,
      totalAmount: true,
      receivedAmountOnVisit: true,
      dueDate: true,
      completedAt: true
    }
  }
} satisfies Prisma.ReceivableInclude;

const receivableDetailInclude = {
  ...receivableListInclude,
  payments: {
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }]
  }
} satisfies Prisma.ReceivableInclude;

type UpdateReceivableFinancialSnapshotInput = {
  amountReceived: Prisma.Decimal;
  amountOutstanding: Prisma.Decimal;
  status: ReceivableStatus;
  settledAt: Date | null;
};

export class ReceivableRepository {
  async create(data: Prisma.ReceivableUncheckedCreateInput, db: DbClient = prisma): Promise<Receivable> {
    return db.receivable.create({ data });
  }

  async findById(id: string, db: DbClient = prisma): Promise<Receivable | null> {
    return db.receivable.findUnique({ where: { id } });
  }

  async findByIdWithDetails(id: string, db: DbClient = prisma): Promise<ReceivableDetailItem | null> {
    return db.receivable.findUnique({
      where: { id },
      include: receivableDetailInclude
    });
  }

  async list(filters: ReceivableListQuery, db: DbClient = prisma): Promise<ReceivableListItem[]> {
    const where: Prisma.ReceivableWhereInput = {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dueDateFrom || filters.dueDateTo
        ? {
            dueDate: {
              ...(filters.dueDateFrom ? { gte: startOfDay(filters.dueDateFrom) } : {}),
              ...(filters.dueDateTo ? { lte: endOfDay(filters.dueDateTo) } : {})
            }
          }
        : {})
    };

    return db.receivable.findMany({
      where,
      include: receivableListInclude,
      orderBy: [{ dueDate: 'asc' }, { issuedAt: 'desc' }]
    });
  }

  async updateFinancialSnapshot(
    id: string,
    data: UpdateReceivableFinancialSnapshotInput,
    db: DbClient = prisma
  ): Promise<Receivable> {
    return db.receivable.update({
      where: { id },
      data
    });
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
