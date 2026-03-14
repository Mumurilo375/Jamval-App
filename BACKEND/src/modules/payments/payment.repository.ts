import { Prisma, type Payment } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type { ClientPaymentHistoryItem } from "./payment.types";

const paymentHistoryInclude = {
  receivable: {
    select: {
      id: true,
      originalAmount: true,
      amountReceived: true,
      amountOutstanding: true,
      status: true,
      dueDate: true,
      visit: {
        select: {
          id: true,
          visitCode: true,
          visitedAt: true
        }
      }
    }
  }
} satisfies Prisma.PaymentInclude;

type PaymentAggregate = {
  amountReceived: Prisma.Decimal;
  latestPaidAt: Date | null;
};

export class PaymentRepository {
  async create(data: Prisma.PaymentUncheckedCreateInput, db: DbClient = prisma): Promise<Payment> {
    return db.payment.create({ data });
  }

  async findById(id: string, db: DbClient = prisma): Promise<Payment | null> {
    return db.payment.findUnique({ where: { id } });
  }

  async aggregateByReceivable(receivableId: string, db: DbClient = prisma): Promise<PaymentAggregate> {
    const result = await db.payment.aggregate({
      where: { receivableId },
      _sum: {
        amount: true
      },
      _max: {
        paidAt: true
      }
    });

    return {
      amountReceived: result._sum.amount ?? new Prisma.Decimal(0),
      latestPaidAt: result._max.paidAt ?? null
    };
  }

  async listByClient(clientId: string, db: DbClient = prisma): Promise<ClientPaymentHistoryItem[]> {
    return db.payment.findMany({
      where: {
        receivable: {
          clientId
        }
      },
      include: paymentHistoryInclude,
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }]
    });
  }
}
