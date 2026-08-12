import type { Prisma, Visit } from "@prisma/client";
import type { z } from "zod";

import {
  bulkUpsertVisitItemsBodySchema,
  completeVisitBodySchema,
  createVisitBodySchema,
  patchVisitItemBodySchema,
  putVisitSignatureBodySchema,
  updateVisitBodySchema,
  visitDraftItemInputSchema,
  visitItemParamsSchema,
  visitListQuerySchema
} from "./visit.schema";

export type CreateVisitInput = z.infer<typeof createVisitBodySchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitBodySchema>;
export type CompleteVisitInput = z.infer<typeof completeVisitBodySchema>;
export type PutVisitSignatureInput = z.infer<typeof putVisitSignatureBodySchema>;
export type VisitListQuery = z.infer<typeof visitListQuerySchema>;
export type VisitDraftItemInput = z.infer<typeof visitDraftItemInputSchema>;
export type BulkUpsertVisitItemsInput = z.infer<typeof bulkUpsertVisitItemsBodySchema>;
export type PatchVisitItemInput = z.infer<typeof patchVisitItemBodySchema>;
export type VisitItemParams = z.infer<typeof visitItemParamsSchema>;

export type VisitWithItems = Prisma.VisitGetPayload<{
  include: {
    items: true;
  };
}>;

export type OperationalDraftVisitRecord = Prisma.VisitGetPayload<{
  select: {
    id: true;
    visitCode: true;
    clientId: true;
    visitType: true;
    visitedAt: true;
    createdAt: true;
    client: {
      select: {
        tradeName: true;
      };
    };
    _count: {
      select: {
        items: true;
      };
    };
  };
}>;

export type OperationalCompletedConsignmentRecord = Prisma.VisitGetPayload<{
  select: {
    id: true;
    visitCode: true;
    clientId: true;
    visitedAt: true;
    createdAt: true;
    client: {
      select: {
        tradeName: true;
      };
    };
  };
}>;

export type OperationalHistoryVisitRecord = Prisma.VisitGetPayload<{
  select: {
    id: true;
    visitCode: true;
    clientId: true;
    visitType: true;
    visitedAt: true;
    completedAt: true;
    totalAmount: true;
    receivedAmountOnVisit: true;
    client: {
      select: {
        tradeName: true;
      };
    };
    receivable: {
      select: {
        amountReceived: true;
        status: true;
      };
    };
    receiptDocument: {
      select: {
        id: true;
      };
    };
  };
}>;

export type OperationalReturnQueueItem = {
  clientId: string;
  clientName: string;
  sourceVisitId: string;
  sourceVisitCode: string;
  lastVisitAt: Date;
  itemCount: number;
  baseQuantity: number;
};

export type OperationalInProgressVisit = {
  visitId: string;
  visitCode: string;
  clientId: string;
  clientName: string;
  visitType: "CONSIGNMENT" | "SALE";
  visitedAt: Date;
  itemCount: number;
  nextStepLabel: string;
};

export type OperationalHistoryVisit = {
  visitId: string;
  visitCode: string;
  clientId: string;
  clientName: string;
  visitType: "CONSIGNMENT" | "SALE";
  visitedAt: Date;
  completedAt: Date | null;
  totalAmount: number;
  receivedAmount: number;
  receivableStatus: "PENDING" | "PARTIAL" | "PAID" | null;
  hasReceipt: boolean;
};

export type OperationalQueueMainAction = {
  mode: "continue" | "new";
  visitId: string | null;
  clientId: string | null;
  clientName: string | null;
  visitCode: string | null;
  visitType: "CONSIGNMENT" | "SALE" | null;
  visitedAt: Date | null;
  nextStepLabel: string | null;
};

export type OperationalVisitQueue = {
  mainAction: OperationalQueueMainAction;
  returnQueue: OperationalReturnQueueItem[];
  inProgress: OperationalInProgressVisit[];
  recentHistory: OperationalHistoryVisit[];
};

export type VisitDraftMetadata = Pick<Visit, "visitType" | "visitedAt" | "notes" | "receivedAmountOnVisit" | "dueDate">;

export type DraftVisitComputedItem = {
  clientProductId: string | null;
  productId: string;
  productSnapshotName: string;
  productSnapshotSku: string;
  productSnapshotLabel: string;
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  quantitySold: number;
  unitPrice: number;
  costPriceSnapshot?: number | null;
  subtotalAmount: number;
  suggestedRestockQuantity: number;
  restockedQuantity: number;
  resultingClientQuantity: number;
  notes?: string;
};

export type ExistingDraftVisitItemEditableFields = {
  clientProductId: string | null;
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  unitPrice: number;
  suggestedRestockQuantity: number;
  restockedQuantity: number;
  notes: string | null;
};
