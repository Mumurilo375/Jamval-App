import { buildApp } from "./app/build-app";
import { env } from "./config/env";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
