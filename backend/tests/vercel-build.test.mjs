import assert from "node:assert/strict";
import { test } from "node:test";

import { buildForVercel } from "../scripts/vercel-build.mjs";

test("production applies pending migrations before generating the deployed client", () => {
  const commands = [];
  buildForVercel("production", (args) => commands.push(args));
  assert.deepEqual(commands, [["migrate", "deploy"], ["generate"]]);
});

for (const environment of ["preview", "development", undefined]) {
  test(`${environment ?? "local"} does not migrate the shared database`, () => {
    const commands = [];
    buildForVercel(environment, (args) => commands.push(args));
    assert.deepEqual(commands, [["generate"]]);
  });
}

test("a migration failure stops the deployment", () => {
  const commands = [];
  assert.throws(() => buildForVercel("production", (args) => {
    commands.push(args);
    throw new Error("Migration failed");
  }), /Migration failed/);
  assert.deepEqual(commands, [["migrate", "deploy"]]);
});
