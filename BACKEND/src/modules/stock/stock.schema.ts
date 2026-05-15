import { z } from "zod";

import {
  dateRangeRefinement,
  nonNegativeMoneySchema,
  optionalTrimmedString,
  positiveIntSchema,
  requiredTrimmedString,
  simpleDateSchema
} from "../../shared/validation/schemas";

const stockBatchItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: positiveIntSchema,
    unitCost: nonNegativeMoneySchema
  })
  .strict();

const stockBatchBodySchema = z
  .object({
    note: optionalTrimmedString(500),
    items: z.array(stockBatchItemSchema).min(1).max(200)
  })
  .strict();

export const centralBalancesQuerySchema = z.object({
  productIds: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value.flatMap((entry) =>
        typeof entry === "string"
          ? entry
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : []
      );
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return value;
  }, z.array(z.string().uuid()).min(1).max(200))
});

export const movementKindSchema = z.enum([
  "INITIAL_LOAD",
  "MANUAL_ENTRY",
  "MANUAL_ADJUSTMENT",
  "RESTOCK_TO_CLIENT",
  "DIRECT_SALE_OUT",
  "DEFECTIVE_RETURN_LOG"
]);

export const centralMovementsQuerySchema = z
  .object({
    search: optionalTrimmedString(120),
    movementKind: movementKindSchema.optional(),
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine(dateRangeRefinement, {
    message: "dateFrom cannot be greater than dateTo",
    path: ["dateFrom"]
  });

export const centralVisitOutflowsQuerySchema = z
  .object({
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine(dateRangeRefinement, {
    message: "dateFrom cannot be greater than dateTo",
    path: ["dateFrom"]
  });

export const centralInitialLoadBodySchema = stockBatchBodySchema;
export const centralManualEntryBodySchema = stockBatchBodySchema;

export const centralManualAdjustmentBodySchema = z
  .object({
    productId: z.string().uuid(),
    direction: z.enum(["IN", "OUT"]),
    quantity: positiveIntSchema,
    reason: requiredTrimmedString(500, "Informe o motivo do ajuste")
  })
  .strict();
