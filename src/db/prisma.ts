import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __jamvalPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__jamvalPrisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (env.NODE_ENV !== "production") {
  global.__jamvalPrisma__ = prisma;
}
