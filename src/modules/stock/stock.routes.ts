import type { FastifyInstance } from "fastify";

import { StockController } from "./stock.controller";

export async function stockRoutes(app: FastifyInstance): Promise<void> {
  const controller = new StockController();

  app.get("/central-balances", controller.listCentralBalances);
  app.get("/central-overview", controller.getCentralOverview);
  app.get("/central-movements", controller.listCentralMovements);
  app.get("/central-visit-outflows", controller.listCentralVisitOutflows);
  app.post("/central-initial-loads", controller.createCentralInitialLoad);
  app.post("/central-manual-entries", controller.createCentralManualEntry);
  app.post("/central-manual-adjustments", controller.createCentralManualAdjustment);
}
