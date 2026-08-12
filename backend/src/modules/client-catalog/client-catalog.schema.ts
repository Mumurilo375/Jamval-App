import { z } from "zod";

import {
  booleanQuerySchema,
  nonNegativeMoneySchema,
  optionalNullableNonNegativeIntSchema,
  optionalNonNegativeIntSchema,
  optionalNonNegativeMoneySchema
} from "../../shared/validation/schemas";

export const clientCatalogClientParamsSchema = z.object({
  clientId: z.string().uuid()
});

export const clientCatalogItemParamsSchema = z.object({
  clientId: z.string().uuid(),
  clientProductId: z.string().uuid()
});

export const clientCatalogListQuerySchema = z.object({
  isActive: booleanQuerySchema
});

export const createClientCatalogBodySchema = z
  .object({
    productId: z.string().uuid(),
    currentUnitPrice: nonNegativeMoneySchema,
    idealQuantity: optionalNonNegativeIntSchema,
    displayOrder: optionalNonNegativeIntSchema,
    isActive: z.boolean().optional().default(true)
  })
  .strict();

export const updateClientCatalogBodySchema = z
  .object({
    currentUnitPrice: optionalNonNegativeMoneySchema,
    idealQuantity: optionalNullableNonNegativeIntSchema,
    displayOrder: optionalNullableNonNegativeIntSchema,
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar"
  });
