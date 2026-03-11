import type { FastifyInstance } from "fastify";

import { VisitController } from "./visit.controller";

export async function visitRoutes(app: FastifyInstance): Promise<void> {
  const controller = new VisitController();

  app.post("/", controller.create);
  app.get("/", controller.list);
  app.get("/:id", controller.getById);
  app.patch("/:id", controller.update);
  app.post("/:id/items/bulk-upsert", controller.bulkUpsertItems);
  app.patch("/:id/items/:itemId", controller.patchItem);
  app.delete("/:id/items/:itemId", controller.deleteItem);
  app.post("/:id/complete", controller.complete);
  app.post("/:id/cancel", controller.cancel);
}
