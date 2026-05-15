import { z } from "zod";

import {
  booleanQuerySchema,
  nonNegativeMoneySchema,
  optionalNullableNonNegativeMoneySchema,
  optionalTrimmedString,
  requiredTrimmedString
} from "../../shared/validation/schemas";

export const productIdParamSchema = z.object({
  id: z.string().uuid()
});

export const productListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  isActive: booleanQuerySchema
});

export const createProductBodySchema = z
  .object({
    sku: requiredTrimmedString(120),
    name: requiredTrimmedString(200),
    category: optionalTrimmedString(120),
    brand: optionalTrimmedString(120),
    model: optionalTrimmedString(120),
    color: optionalTrimmedString(80),
    voltage: optionalTrimmedString(80),
    connectorType: optionalTrimmedString(80),
    basePrice: nonNegativeMoneySchema.default(0),
    costPrice: optionalNullableNonNegativeMoneySchema,
    isActive: z.boolean().optional().default(true)
  })
  .strict();

export const updateProductBodySchema = createProductBodySchema
  .omit({ sku: true })
  .partial()
  .extend({
    sku: requiredTrimmedString(120).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar"
  });
