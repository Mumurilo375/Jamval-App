import type { z } from "zod";

import { adminCompanyProfileBodySchema, adminDashboardQuerySchema, adminProfitQuerySchema } from "./admin.schema";

export type AdminProfitQuery = z.infer<typeof adminProfitQuerySchema>;
export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
export type AdminCompanyProfileInput = z.infer<typeof adminCompanyProfileBodySchema>;
