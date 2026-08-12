import type { z } from "zod";

import {
  clientCatalogClientParamsSchema,
  clientCatalogItemParamsSchema,
  clientCatalogListQuerySchema,
  createClientCatalogBodySchema,
  updateClientCatalogBodySchema
} from "./client-catalog.schema";

export type ClientCatalogClientParams = z.infer<typeof clientCatalogClientParamsSchema>;
export type ClientCatalogItemParams = z.infer<typeof clientCatalogItemParamsSchema>;
export type ClientCatalogListQuery = z.infer<typeof clientCatalogListQuerySchema>;
export type CreateClientCatalogInput = z.infer<typeof createClientCatalogBodySchema>;
export type UpdateClientCatalogInput = z.infer<typeof updateClientCatalogBodySchema>;
