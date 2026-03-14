import "dotenv/config";

import { z } from "zod";

const resolvedDatabaseUrl = resolveDatabaseUrl(process.env);

if (!process.env.DATABASE_URL && resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  AUTH_COOKIE_NAME: z.string().trim().min(1).default("jamval_session"),
  CORS_ORIGIN: z.string().trim().optional(),
  COMPANY_NAME: z.string().trim().optional(),
  COMPANY_DOCUMENT: z.string().trim().optional(),
  COMPANY_PHONE: z.string().trim().optional(),
  COMPANY_ADDRESS: z.string().trim().optional(),
  COMPANY_EMAIL: z.string().trim().optional(),
  COMPANY_CONTACT_NAME: z.string().trim().optional()
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL: resolvedDatabaseUrl ?? process.env.DATABASE_URL
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
