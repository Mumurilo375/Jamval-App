import "fastify";

import type { AuthenticatedUser } from "./auth.types";

declare module "fastify" {
  interface FastifyContextConfig {
    auth?: boolean;
  }

  interface FastifyRequest {
    authUser: AuthenticatedUser | null;
  }
}

export {};
