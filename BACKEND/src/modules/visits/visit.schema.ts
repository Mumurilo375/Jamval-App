import { PaymentMethod, VisitStatus, VisitType } from "@prisma/client";
import { z } from "zod";

const nonNegativeIntSchema = z.coerce.number().int().min(0);
const nonNegativeNumberSchema = z.coerce.number().min(0);

const dateTimeSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return value;
}, z.date());

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

export const visitIdParamSchema = z.object({
  id: z.string().uuid()
});

export const visitItemParamsSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid()
});

export const createVisitBodySchema = z.object({
  clientId: z.string().uuid(),
  visitType: z.nativeEnum(VisitType).optional().default(VisitType.CONSIGNMENT),
  visitedAt: dateTimeSchema.optional(),
  notes: z.string().trim().optional(),
  receivedAmountOnVisit: nonNegativeNumberSchema.optional().default(0),
  dueDate: simpleDateSchema.optional()
});

export const updateVisitBodySchema = z
  .object({
    visitType: z.nativeEnum(VisitType).optional(),
    visitedAt: dateTimeSchema.optional(),
    notes: z.string().trim().optional(),
    receivedAmountOnVisit: nonNegativeNumberSchema.optional(),
    dueDate: simpleDateSchema.nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const visitListQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.nativeEnum(VisitStatus).optional(),
  visitType: z.nativeEnum(VisitType).optional(),
  dateFrom: simpleDateSchema.optional(),
  dateTo: simpleDateSchema.optional()
});

export const visitDraftItemInputSchema = z.object({
  productId: z.string().uuid(),
  clientProductId: z.string().uuid().nullable().optional(),
  quantityPrevious: nonNegativeIntSchema,
  quantityGoodRemaining: nonNegativeIntSchema,
  quantityDefectiveReturn: nonNegativeIntSchema,
  quantityLoss: nonNegativeIntSchema,
  unitPrice: nonNegativeNumberSchema.optional(),
  suggestedRestockQuantity: nonNegativeIntSchema.optional().default(0),
  restockedQuantity: nonNegativeIntSchema.optional().default(0),
  notes: z.string().trim().optional()
});

export const bulkUpsertVisitItemsBodySchema = z.object({
  items: z.array(visitDraftItemInputSchema).min(1)
});

export const patchVisitItemBodySchema = z
  .object({
    clientProductId: z.string().uuid().nullable().optional(),
    quantityPrevious: nonNegativeIntSchema.optional(),
    quantityGoodRemaining: nonNegativeIntSchema.optional(),
    quantityDefectiveReturn: nonNegativeIntSchema.optional(),
    quantityLoss: nonNegativeIntSchema.optional(),
    unitPrice: nonNegativeNumberSchema.optional(),
    suggestedRestockQuantity: nonNegativeIntSchema.optional(),
    restockedQuantity: nonNegativeIntSchema.optional(),
    notes: z.string().trim().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

const initialPaymentSchema = z
  .object({
    paymentMethod: z.nativeEnum(PaymentMethod),
    reference: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .strict();

export const completeVisitBodySchema = z
  .object({
    initialPayment: initialPaymentSchema.optional()
  })
  .strict()
  .default({});

const supportedSignatureMimeTypeSchema = z.enum(["image/png", "image/jpeg", "image/jpg"]);

export const putVisitSignatureBodySchema = z
  .object({
    signatureName: z.string().trim().min(1).max(160),
    mimeType: supportedSignatureMimeTypeSchema,
    signatureImageBase64: z.string().trim().min(1)
  })
  .strict();
