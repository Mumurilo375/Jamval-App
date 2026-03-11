import { z } from "zod";

export const receiptVisitParamsSchema = z.object({
  id: z.string().uuid()
});

export const receiptDocumentParamsSchema = z.object({
  id: z.string().uuid()
});
