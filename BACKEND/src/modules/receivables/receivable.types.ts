import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import {
  clientReceivableParamsSchema,
  receivableIdParamSchema,
  receivableListQuerySchema
} from "./receivable.schema";

export type ReceivableListQuery = z.infer<typeof receivableListQuerySchema>;
export type ReceivableIdParam = z.infer<typeof receivableIdParamSchema>;
export type ClientReceivableParams = z.infer<typeof clientReceivableParamsSchema>;

export type ReceivableListItem = Prisma.ReceivableGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        tradeName: true;
      };
    };
    visit: {
      select: {
        id: true;
        visitCode: true;
        visitedAt: true;
        status: true;
        totalAmount: true;
        receivedAmountOnVisit: true;
        dueDate: true;
        completedAt: true;
      };
    };
  };
}>;

export type ReceivableDetailItem = Prisma.ReceivableGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        tradeName: true;
      };
    };
    visit: {
      select: {
        id: true;
        visitCode: true;
        visitedAt: true;
        status: true;
        totalAmount: true;
        receivedAmountOnVisit: true;
        dueDate: true;
        completedAt: true;
      };
    };
    payments: true;
  };
}>;
