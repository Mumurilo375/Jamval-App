import type { User } from "@prisma/client";
import type { z } from "zod";

import { loginBodySchema } from "./auth.schema";

export type LoginInput = z.infer<typeof loginBodySchema>;

export type AuthenticatedUser = Pick<User, "id" | "name" | "email" | "isActive" | "lastLoginAt">;
