import type { FastifyInstance } from "fastify";

import { ReceivableController } from "./receivable.controller";

export async function receivableRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ReceivableController();

  app.get("/receivables", controller.list);
  app.get("/receivables/:id", controller.getById);
  app.get("/clients/:id/receivables", controller.listByClient);
}
