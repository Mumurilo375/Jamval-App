import type { z } from "zod";

import { adminCompanyProfileBodySchema, adminProfitQuerySchema } from "./admin.schema";

export type AdminProfitQuery = z.infer<typeof adminProfitQuerySchema>;
export type AdminCompanyProfileInput = z.infer<typeof adminCompanyProfileBodySchema>;
