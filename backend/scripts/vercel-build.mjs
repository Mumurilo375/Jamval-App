import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function runPrisma(args) {
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: backendDirectory,
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma ${args.join(" ")} failed; deployment stopped.`);
}

export function buildForVercel(environment, run = runPrisma) {
  // Preview deployments can share the production database; only production may migrate it.
  if (environment === "production") {
    run(["migrate", "deploy"]);
  }

  run(["generate"]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildForVercel(process.env.VERCEL_ENV);
}
