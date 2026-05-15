import type { IncomingMessage, ServerResponse } from "node:http";

import { buildApp } from "../src/app/build-app";

let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) {
    // Reuse the Fastify instance between invocations when possible.
    appPromise = buildApp();
  }

  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  await app.ready();
  app.server.emit("request", req, res);
}
