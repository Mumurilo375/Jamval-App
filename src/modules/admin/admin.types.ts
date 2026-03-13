import type { z } from "zod";

import { adminProfitQuerySchema } from "./admin.schema";

export type AdminProfitQuery = z.infer<typeof adminProfitQuerySchema>;
