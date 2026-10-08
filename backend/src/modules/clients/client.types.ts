import type { z } from "zod";

import {
  clientListQuerySchema,
  createClientBodySchema,
  updateClientBodySchema
} from "./client.schema";

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientBodySchema>;
export type UpdateClientInput = z.infer<typeof updateClientBodySchema>;
