import type { z } from "zod";

import {
  createProductBodySchema,
  productListQuerySchema,
  updateProductBodySchema
} from "./product.schema";

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductBodySchema>;
export type UpdateProductInput = z.infer<typeof updateProductBodySchema>;
