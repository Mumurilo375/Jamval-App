import { ReceivableStatus } from "@prisma/client";
import { z } from "zod";

import { simpleDateSchema } from "../../shared/validation/schemas";

export const receivableIdParamSchema = z.object({
  id: z.string().uuid()
});

export const receivableListQuerySchema = z
  .object({
    clientId: z.string().uuid().optional(),
    status: z.nativeEnum(ReceivableStatus).optional(),
    dueDateFrom: simpleDateSchema.optional(),
    dueDateTo: simpleDateSchema.optional()
  })
  .refine((value) => !value.dueDateFrom || !value.dueDateTo || value.dueDateFrom <= value.dueDateTo, {
    message: "dueDateFrom cannot be greater than dueDateTo",
    path: ["dueDateFrom"]
  });

export const clientReceivableParamsSchema = z.object({
  id: z.string().uuid()
});
