import crypto from "node:crypto";

import type { FastifyReply } from "fastify";

import { env } from "../../config/env";

export function getAuthCookieName(): string {
  return env.AUTH_COOKIE_NAME;
}

export function getSessionTtlMs(): number {
  return env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000;
}

export function getSessionTtlSeconds(): number {
  return env.AUTH_SESSION_TTL_HOURS * 60 * 60;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildSessionExpiresAt(baseDate = new Date()): Date {
  return new Date(baseDate.getTime() + getSessionTtlMs());
}

function isProductionEnvironment(): boolean {
  return env.NODE_ENV === "production";
}

function getCookieSameSitePolicy(): "lax" | "none" {
  return isProductionEnvironment() ? "none" : "lax";
}

export function setSessionCookie(reply: FastifyReply, sessionToken: string): void {
  reply.setCookie(getAuthCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: getCookieSameSitePolicy(),
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: getSessionTtlSeconds()
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(getAuthCookieName(), {
    httpOnly: true,
    sameSite: getCookieSameSitePolicy(),
    secure: isProductionEnvironment(),
    path: "/"
  });
}
