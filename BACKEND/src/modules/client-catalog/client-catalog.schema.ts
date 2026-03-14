import { z } from "zod";

export const clientCatalogClientParamsSchema = z.object({
  clientId: z.string().uuid()
});

export const clientCatalogItemParamsSchema = z.object({
  clientId: z.string().uuid(),
  clientProductId: z.string().uuid()
});

export const clientCatalogListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional()
});

export const createClientCatalogBodySchema = z.object({
  productId: z.string().uuid(),
  currentUnitPrice: z.coerce.number().min(0),
  idealQuantity: z.coerce.number().int().min(0).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateClientCatalogBodySchema = z.object({
  currentUnitPrice: z.coerce.number().min(0).optional(),
  idealQuantity: z.coerce.number().int().min(0).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional()
});
