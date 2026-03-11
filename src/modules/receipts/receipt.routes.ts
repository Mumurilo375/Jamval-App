import type { FastifyInstance } from "fastify";

import { ReceiptController } from "./receipt.controller";

export async function receiptRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ReceiptController();

  app.post("/visits/:id/receipt", controller.generate);
  app.get("/visits/:id/receipt", controller.getByVisit);
  app.get("/receipt-documents/:id/download", controller.download);
}
