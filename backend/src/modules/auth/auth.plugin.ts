import type { FastifyInstance, FastifyRequest } from "fastify";

import { AppError } from "../../shared/errors/app-error";
import { AuthRepository } from "./auth.repository";
import { clearSessionCookie, getAuthCookieName, hashSessionToken } from "./auth-session";
import { mapAuthenticatedUser } from "./auth.service";

export const AUTH_PUBLIC_ROUTE_CONFIG = {
  config: {
    auth: false
  }
} as const;

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  const repository = new AuthRepository();

  app.decorateRequest("authUser", null);

  app.addHook("preHandler", async (request, reply) => {
    if (request.routeOptions.config.auth === false) {
      return;
    }

    const sessionToken = request.cookies[getAuthCookieName()];

    if (!sessionToken) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const user = await repository.findBySessionTokenHash(hashSessionToken(sessionToken));

    if (!user) {
      clearSessionCookie(reply);
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!user.isActive) {
      await clearUserSessionBestEffort(repository, user.id);
      clearSessionCookie(reply);
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!user.sessionExpiresAt || user.sessionExpiresAt.getTime() <= Date.now()) {
      await clearUserSessionBestEffort(repository, user.id);
      clearSessionCookie(reply);
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    request.authUser = mapAuthenticatedUser(user);
  });
}

async function clearUserSessionBestEffort(repository: AuthRepository, userId: string): Promise<void> {
  try {
    await repository.clearSession(userId);
  } catch {
    return;
  }
}
