import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();
const optionalMoney = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value;
}, z.coerce.number().min(0).nullable().optional());

export const productIdParamSchema = z.object({
  id: z.string().uuid()
});

export const productListQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional()
});

export const createProductBodySchema = z.object({
  sku: nonEmptyString.max(120),
  name: nonEmptyString.max(200),
  category: optionalText,
  brand: optionalText,
  model: optionalText,
  color: optionalText,
  voltage: optionalText,
  connectorType: optionalText,
  basePrice: z.coerce.number().min(0).default(0),
  costPrice: optionalMoney,
  isActive: z.boolean().optional().default(true)
});

export const updateProductBodySchema = createProductBodySchema
  .omit({ sku: true })
  .partial()
  .extend({
    sku: nonEmptyString.max(120).optional()
  });
