import type { FastifyInstance } from "fastify";

import { AdminController } from "./admin.controller";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const controller = new AdminController();

  app.get("/dashboard", controller.getDashboard);
  app.get("/profit", controller.getProfit);
  app.get("/indicators", controller.getIndicators);
}
