import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { prisma } from "../db/prisma";
import { registerAuthPlugin } from "../modules/auth/auth.plugin";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(cookie);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await registerAuthPlugin(app);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}
