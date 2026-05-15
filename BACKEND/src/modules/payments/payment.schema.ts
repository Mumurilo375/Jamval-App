import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

import { optionalTrimmedString, positiveMoneySchema } from "../../shared/validation/schemas";

export const receivablePaymentParamsSchema = z.object({
  id: z.string().uuid()
});

export const createPaymentBodySchema = z
  .object({
    amount: positiveMoneySchema,
    paymentMethod: z.nativeEnum(PaymentMethod),
    reference: optionalTrimmedString(160),
    notes: optionalTrimmedString(2000)
  })
  .strict();

export const clientPaymentHistoryParamsSchema = z.object({
  id: z.string().uuid()
});
