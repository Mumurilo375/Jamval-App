import type { FastifyInstance } from "fastify";

import { AUTH_PUBLIC_ROUTE_CONFIG } from "../modules/auth/auth.plugin";
import { authRoutes } from "../modules/auth/auth.routes";
import { clientCatalogRoutes } from "../modules/client-catalog/client-catalog.routes";
import { clientRoutes } from "../modules/clients/client.routes";
import { paymentRoutes } from "../modules/payments/payment.routes";
import { productRoutes } from "../modules/products/product.routes";
import { receivableRoutes } from "../modules/receivables/receivable.routes";
import { receiptRoutes } from "../modules/receipts/receipt.routes";
import { visitRoutes } from "../modules/visits/visit.routes";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", AUTH_PUBLIC_ROUTE_CONFIG, async () => ({ data: { status: "ok" } }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(productRoutes, { prefix: "/products" });
  await app.register(clientRoutes, { prefix: "/clients" });
  await app.register(clientCatalogRoutes);
  await app.register(visitRoutes, { prefix: "/visits" });
  await app.register(receivableRoutes);
  await app.register(paymentRoutes);
  await app.register(receiptRoutes);
}
