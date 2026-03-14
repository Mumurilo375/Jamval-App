import { ReceivableStatus } from "@prisma/client";
import { z } from "zod";

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

export const receivableIdParamSchema = z.object({
  id: z.string().uuid()
});

export const receivableListQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.nativeEnum(ReceivableStatus).optional(),
  dueDateFrom: simpleDateSchema.optional(),
  dueDateTo: simpleDateSchema.optional()
});

export const clientReceivableParamsSchema = z.object({
  id: z.string().uuid()
});
