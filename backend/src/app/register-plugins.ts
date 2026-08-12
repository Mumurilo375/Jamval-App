import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { registerAuthPlugin } from "../modules/auth/auth.plugin";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  const allowedOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",")
        .map((origin) => normalizeOrigin(origin.trim()))
        .filter((origin) => origin.length > 0)
    : null;

  await app.register(cookie);
  await app.register(cors, {
    origin: allowedOrigins
      ? (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }

          const normalizedOrigin = normalizeOrigin(origin);
          const isAllowed = allowedOrigins.some((allowedOrigin) =>
            matchesAllowedOrigin(normalizedOrigin, allowedOrigin)
          );

          callback(null, isAllowed);
        }
      : true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  await registerAuthPlugin(app);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function matchesAllowedOrigin(origin: string, allowedOrigin: string): boolean {
  if (allowedOrigin === "*") {
    return true;
  }

  if (allowedOrigin.startsWith("*.")) {
    const domain = allowedOrigin.slice(2);
    return origin === domain || origin.endsWith(`.${domain}`);
  }

  return origin === allowedOrigin;
}
