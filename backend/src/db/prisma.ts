import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";
import { buildRuntimeDatabaseUrl } from "./runtime-database-url";

declare global {
  // eslint-disable-next-line no-var
  var __jamvalPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__jamvalPrisma__ ??
  new PrismaClient({
    // Runtime only: Prisma CLI migrations continue using their configured connection.
    datasourceUrl: buildRuntimeDatabaseUrl(env.DATABASE_URL, process.env.VERCEL === "1"),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

global.__jamvalPrisma__ = prisma;
