import type { z } from "zod";

import {
  clientCatalogListQuerySchema,
  createClientCatalogBodySchema,
  updateClientCatalogBodySchema
} from "./client-catalog.schema";

export type ClientCatalogListQuery = z.infer<typeof clientCatalogListQuerySchema>;
export type CreateClientCatalogInput = z.infer<typeof createClientCatalogBodySchema>;
export type UpdateClientCatalogInput = z.infer<typeof updateClientCatalogBodySchema>;
