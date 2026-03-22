import { z } from "zod";

const positiveIntSchema = z.coerce.number().int().min(1);
const nonNegativeMoneySchema = z.coerce.number().min(0);
const optionalTextSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value;
}, z.string().trim().min(1).max(500).optional());

const simpleDateSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value;
    }

    return new Date(`${value.trim()}T00:00:00.000Z`);
  }

  return value;
}, z.date());

const stockBatchItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveIntSchema,
  unitCost: nonNegativeMoneySchema
});

const stockBatchBodySchema = z
  .object({
    note: optionalTextSchema,
    items: z.array(stockBatchItemSchema).min(1)
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
  }, z.array(z.string().uuid()).min(1))
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
    search: z.string().trim().optional(),
    movementKind: movementKindSchema.optional(),
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom.getTime() <= value.dateTo.getTime(),
    {
      message: "dateFrom cannot be greater than dateTo",
      path: ["dateFrom"]
    }
  );

export const centralVisitOutflowsQuerySchema = z
  .object({
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom.getTime() <= value.dateTo.getTime(),
    {
      message: "dateFrom cannot be greater than dateTo",
      path: ["dateFrom"]
    }
  );

export const centralInitialLoadBodySchema = stockBatchBodySchema;
export const centralManualEntryBodySchema = stockBatchBodySchema;

export const centralManualAdjustmentBodySchema = z
  .object({
    productId: z.string().uuid(),
    direction: z.enum(["IN", "OUT"]),
    quantity: positiveIntSchema,
    reason: z.string().trim().min(1).max(500)
  })
  .strict();
