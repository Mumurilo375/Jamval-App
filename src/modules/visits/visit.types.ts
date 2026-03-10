import type { Prisma, Visit } from "@prisma/client";
import type { z } from "zod";

import {
  bulkUpsertVisitItemsBodySchema,
  createVisitBodySchema,
  patchVisitItemBodySchema,
  updateVisitBodySchema,
  visitDraftItemInputSchema,
  visitItemParamsSchema,
  visitListQuerySchema
} from "./visit.schema";

export type CreateVisitInput = z.infer<typeof createVisitBodySchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitBodySchema>;
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

export type VisitDraftMetadata = Pick<Visit, "visitedAt" | "notes" | "receivedAmountOnVisit" | "dueDate">;

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
