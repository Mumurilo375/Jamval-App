import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl = resolveDatabaseUrl(process.env);

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DB_* variables are required to configure Prisma.");
}

process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: databaseUrl
  }
});

function resolveDatabaseUrl(processEnv: NodeJS.ProcessEnv): string | undefined {
  const explicitDatabaseUrl = processEnv.DATABASE_URL?.trim();

  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  const legacyHost = processEnv.DB_HOST?.trim();
  const legacyPort = processEnv.DB_PORT?.trim();
  const legacyName = processEnv.DB_NAME?.trim();
  const legacyUser = processEnv.DB_USER?.trim();
  const legacyPassword = processEnv.DB_PASSWORD;

  if (!legacyHost || !legacyPort || !legacyName || !legacyUser || legacyPassword === undefined) {
    return undefined;
  }

  const encodedUser = encodeURIComponent(legacyUser);
  const encodedPassword = encodeURIComponent(legacyPassword);
  const encodedDatabaseName = encodeURIComponent(legacyName);

  return `postgresql://${encodedUser}:${encodedPassword}@${legacyHost}:${legacyPort}/${encodedDatabaseName}?schema=public`;
}
