import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { receivableListQuerySchema } from "./receivable.schema";

export type ReceivableListQuery = z.infer<typeof receivableListQuerySchema>;

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
        visitType: true;
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
        visitType: true;
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
