import type { FastifyInstance } from "fastify";

import { ClientCatalogController } from "./client-catalog.controller";

export async function clientCatalogRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ClientCatalogController();

  app.get("/clients/:clientId/products", controller.listByClient);
  app.post("/clients/:clientId/products", controller.create);
  app.patch("/clients/:clientId/products/:clientProductId", controller.update);
}
