import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { prisma } from "../db/prisma";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(cors, { origin: true });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}
