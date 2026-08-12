import { z } from "zod";

import {
  dateRangeRefinement,
  optionalNullableCnpjSchema,
  optionalNullablePhoneSchema,
  optionalNullableTrimmedString,
  requiredTrimmedString,
  simpleDateSchema
} from "../../shared/validation/schemas";

const adminDateRangeQueryBaseSchema = z.object({
  dateFrom: simpleDateSchema.optional(),
  dateTo: simpleDateSchema.optional()
});

const adminDateRangeQuerySchema = adminDateRangeQueryBaseSchema.refine(
  dateRangeRefinement,
  "dateFrom must be before or equal to dateTo"
);

export const adminProfitQuerySchema = adminDateRangeQuerySchema;

export const adminDashboardQuerySchema = adminDateRangeQueryBaseSchema.extend({
  range: z.enum(["7d", "30d", "month"]).optional().default("30d")
}).refine((value) => {
  if (!value.dateFrom || !value.dateTo) {
    return true;
  }

  return value.dateFrom.getTime() <= value.dateTo.getTime();
}, "dateFrom must be before or equal to dateTo");

export const adminCompanyProfileBodySchema = z.object({
  companyName: requiredTrimmedString(200, "companyName is required"),
  document: optionalNullableCnpjSchema,
  phone: optionalNullablePhoneSchema,
  address: optionalNullableTrimmedString(200),
  email: optionalNullableTrimmedString(160).refine(
    (value) => value === undefined || value === null || z.string().email().safeParse(value).success,
    "Informe um email valido"
  ),
  contactName: optionalNullableTrimmedString(160)
}).strict();
