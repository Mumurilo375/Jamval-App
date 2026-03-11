import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

const positiveNumberSchema = z.coerce.number().positive();

export const receivablePaymentParamsSchema = z.object({
  id: z.string().uuid()
});

export const createPaymentBodySchema = z
  .object({
    amount: positiveNumberSchema,
    paymentMethod: z.nativeEnum(PaymentMethod),
    reference: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .strict();

export const clientPaymentHistoryParamsSchema = z.object({
  id: z.string().uuid()
});
