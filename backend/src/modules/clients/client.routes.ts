import type { FastifyInstance } from "fastify";

import { ClientController } from "./client.controller";

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ClientController();

  app.get("/", controller.list);
  app.get("/:id", controller.getById);
  app.post("/", controller.create);
  app.patch("/:id", controller.update);
}
