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

export const adminProfitQuerySchema = z
  .object({
    dateFrom: simpleDateSchema.optional(),
    dateTo: simpleDateSchema.optional()
  })
  .refine((value) => {
    if (!value.dateFrom || !value.dateTo) {
      return true;
    }

    return value.dateFrom.getTime() <= value.dateTo.getTime();
  }, "dateFrom must be before or equal to dateTo");
