import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { createPaymentBodySchema } from "./payment.schema";

export type CreatePaymentInput = z.infer<typeof createPaymentBodySchema>;

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
