import type { FastifyInstance } from "fastify";

import { AUTH_PUBLIC_ROUTE_CONFIG } from "./auth.plugin";
import { AuthController } from "./auth.controller";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const controller = new AuthController();

  app.post("/login", AUTH_PUBLIC_ROUTE_CONFIG, controller.login);
  app.post("/logout", controller.logout);
  app.get("/me", controller.me);
}
