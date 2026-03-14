import Fastify from "fastify";

import { env } from "../config/env";
import { registerErrorHandler } from "./error-handler";
import { registerPlugins } from "./register-plugins";
import { registerRoutes } from "./register-routes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  registerErrorHandler(app);
  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
