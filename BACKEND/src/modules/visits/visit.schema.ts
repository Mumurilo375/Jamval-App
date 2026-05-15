import { PaymentMethod, VisitStatus, VisitType } from "@prisma/client";
import { z } from "zod";

import {
  dateRangeRefinement,
  dateTimeSchema,
  nonNegativeIntSchema,
  nonNegativeMoneySchema,
  optionalNonNegativeIntSchema,
  optionalNonNegativeMoneySchema,
  optionalTrimmedString,
  simpleDateSchema,
  requiredTrimmedString
} from "../../shared/validation/schemas";

export const visitIdParamSchema = z.object({
  id: z.string().uuid()
});

export const visitItemParamsSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid()
});

export const createVisitBodySchema = z
  .object({
    clientId: z.string().uuid(),
    visitType: z.nativeEnum(VisitType).optional().default(VisitType.CONSIGNMENT),
    visitedAt: dateTimeSchema.optional(),
    notes: optionalTrimmedString(2000),
    receivedAmountOnVisit: optionalNonNegativeMoneySchema.default(0),
    dueDate: simpleDateSchema.optional()
  })
  .strict();

export const updateVisitBodySchema = z
  .object({
    visitType: z.nativeEnum(VisitType).optional(),
    visitedAt: dateTimeSchema.optional(),
    notes: optionalTrimmedString(2000),
    receivedAmountOnVisit: optionalNonNegativeMoneySchema,
    dueDate: simpleDateSchema.nullable().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const visitListQuerySchema = z
  .object({
    clientId: z.string().uuid().optional(),
    status: z.nativeEnum(VisitStatus).optional(),
    visitType: z.nativeEnum(VisitType).optional(),
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine(dateRangeRefinement, {
    message: "dateFrom cannot be greater than dateTo",
    path: ["dateFrom"]
  });

export const visitDraftItemInputSchema = z
  .object({
    productId: z.string().uuid(),
    clientProductId: z.string().uuid().nullable().optional(),
    quantityPrevious: nonNegativeIntSchema,
    quantityGoodRemaining: nonNegativeIntSchema,
    quantityDefectiveReturn: nonNegativeIntSchema,
    quantityLoss: nonNegativeIntSchema,
    unitPrice: optionalNonNegativeMoneySchema,
    suggestedRestockQuantity: optionalNonNegativeIntSchema.default(0),
    restockedQuantity: optionalNonNegativeIntSchema.default(0),
    notes: optionalTrimmedString(1000)
  })
  .strict()
  .superRefine((item, context) => {
    const accountedQuantity = item.quantityGoodRemaining + item.quantityDefectiveReturn + item.quantityLoss;

    if (accountedQuantity > item.quantityPrevious) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A soma de saldo restante, trocas e perdas nao pode passar da quantidade anterior",
        path: ["quantityGoodRemaining"]
      });
    }
  });

export const bulkUpsertVisitItemsBodySchema = z
  .object({
    items: z.array(visitDraftItemInputSchema).min(1).max(200)
  })
  .strict();

export const patchVisitItemBodySchema = z
  .object({
    clientProductId: z.string().uuid().nullable().optional(),
    quantityPrevious: optionalNonNegativeIntSchema,
    quantityGoodRemaining: optionalNonNegativeIntSchema,
    quantityDefectiveReturn: optionalNonNegativeIntSchema,
    quantityLoss: optionalNonNegativeIntSchema,
    unitPrice: optionalNonNegativeMoneySchema,
    suggestedRestockQuantity: optionalNonNegativeIntSchema,
    restockedQuantity: optionalNonNegativeIntSchema,
    notes: optionalTrimmedString(1000)
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

const initialPaymentSchema = z
  .object({
    paymentMethod: z.nativeEnum(PaymentMethod),
    reference: optionalTrimmedString(160),
    notes: optionalTrimmedString(2000)
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
    signatureName: requiredTrimmedString(160),
    mimeType: supportedSignatureMimeTypeSchema,
    signatureImageBase64: z.string().trim().min(1).max(7_000_000)
  })
  .strict();
