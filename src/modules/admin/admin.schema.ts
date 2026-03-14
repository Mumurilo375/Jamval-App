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

const optionalNullableText = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return value;
  }, z.string().max(maxLength).nullable().optional());

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

export const adminCompanyProfileBodySchema = z.object({
  companyName: z.string().trim().min(1, "companyName is required").max(200),
  document: optionalNullableText(32),
  phone: optionalNullableText(32),
  address: optionalNullableText(200),
  email: optionalNullableText(160),
  contactName: optionalNullableText(160)
});
