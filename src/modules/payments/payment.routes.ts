import type { FastifyInstance } from "fastify";

import { PaymentController } from "./payment.controller";

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  const controller = new PaymentController();

  app.post("/receivables/:id/payments", controller.create);
  app.get("/clients/:id/payment-history", controller.listByClient);
}
