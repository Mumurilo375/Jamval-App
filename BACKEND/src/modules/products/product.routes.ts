import type { FastifyInstance } from "fastify";

import { ProductController } from "./product.controller";

export async function productRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ProductController();

  app.get("/", controller.list);
  app.get("/:id", controller.getById);
  app.post("/", controller.create);
  app.patch("/:id", controller.update);
  app.post("/:id/activate", controller.activate);
  app.post("/:id/deactivate", controller.deactivate);
}
