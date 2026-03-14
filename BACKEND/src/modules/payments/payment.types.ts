import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import {
  clientPaymentHistoryParamsSchema,
  createPaymentBodySchema,
  receivablePaymentParamsSchema
} from "./payment.schema";

export type CreatePaymentInput = z.infer<typeof createPaymentBodySchema>;
export type ReceivablePaymentParams = z.infer<typeof receivablePaymentParamsSchema>;
export type ClientPaymentHistoryParams = z.infer<typeof clientPaymentHistoryParamsSchema>;

export type ClientPaymentHistoryItem = Prisma.PaymentGetPayload<{
  include: {
    receivable: {
      select: {
        id: true;
        originalAmount: true;
        amountReceived: true;
        amountOutstanding: true;
        status: true;
        dueDate: true;
        visit: {
          select: {
            id: true;
            visitCode: true;
            visitedAt: true;
          };
        };
      };
    };
  };
}>;
