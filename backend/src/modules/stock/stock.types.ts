import type { z } from "zod";

import {
  centralInitialLoadBodySchema,
  centralManualAdjustmentBodySchema,
  centralManualEntryBodySchema,
  centralMovementsQuerySchema,
  centralVisitOutflowsQuerySchema
} from "./stock.schema";

export type CentralMovementsQuery = z.infer<typeof centralMovementsQuerySchema>;
export type CentralVisitOutflowsQuery = z.infer<typeof centralVisitOutflowsQuerySchema>;
export type CentralInitialLoadInput = z.infer<typeof centralInitialLoadBodySchema>;
export type CentralManualEntryInput = z.infer<typeof centralManualEntryBodySchema>;
export type CentralManualAdjustmentInput = z.infer<typeof centralManualAdjustmentBodySchema>;
