import "dotenv/config";

import { readdirSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "prisma/config";

const databaseUrl = resolveDatabaseUrl(process.env);
const directDatabaseUrl = resolveDirectDatabaseUrl(process.env);

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DB_* variables are required to configure Prisma.");
}

process.env.DATABASE_URL = databaseUrl;

logPrismaConfigDiagnostics({
  databaseUrl,
  directDatabaseUrl
});

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: databaseUrl,
    ...(directDatabaseUrl ? { directUrl: directDatabaseUrl } : {})
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

function resolveDirectDatabaseUrl(processEnv: NodeJS.ProcessEnv): string | undefined {
  const explicitDirectDatabaseUrl =
    processEnv.DIRECT_URL?.trim() ||
    processEnv.MIGRATION_DATABASE_URL?.trim() ||
    processEnv.PRISMA_DIRECT_URL?.trim();

  return explicitDirectDatabaseUrl || undefined;
}

function logPrismaConfigDiagnostics(input: {
  databaseUrl: string;
  directDatabaseUrl?: string;
}): void {
  const migrationDirectory = path.join(process.cwd(), "prisma", "migrations");
  const migrationNames = safeReadMigrationNames(migrationDirectory);

  console.log("[prisma-config] DATABASE_URL host:", safeExtractHost(input.databaseUrl));
  console.log("[prisma-config] DIRECT_URL host:", input.directDatabaseUrl ? safeExtractHost(input.directDatabaseUrl) : "<not set>");
  console.log("[prisma-config] migration dir:", migrationDirectory);
  console.log("[prisma-config] migrations:", migrationNames.length > 0 ? migrationNames.join(", ") : "<none found>");
}

function safeReadMigrationNames(migrationDirectory: string): string[] {
  try {
    return readdirSync(migrationDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function safeExtractHost(connectionString: string): string {
  try {
    return new URL(connectionString).host;
  } catch {
    return "<invalid url>";
  }
}
