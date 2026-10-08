import assert from "node:assert/strict";
import { after, test } from "node:test";
import Fastify from "fastify";
import { Prisma } from "@prisma/client";
import { register } from "tsx/cjs/api";

// These tests use fake connections and never contact a database.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NODE_ENV = "production";

// Share a loader so instanceof checks use the same AppError class in every module.
const loader = register({ namespace: "database-connections-tests" });
after(() => loader.unregister());
const { buildRuntimeDatabaseUrl } = loader.require("../src/db/runtime-database-url.ts", import.meta.url);
const { registerErrorHandler } = loader.require("../src/app/error-handler.ts", import.meta.url);
const { AuthController } = loader.require("../src/modules/auth/auth.controller.ts", import.meta.url);
const { AuthService } = loader.require("../src/modules/auth/auth.service.ts", import.meta.url);

const sessionUrl = "postgresql://postgres.example:p%40ss%3Aword@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require&connection_limit=15";

test("Vercel uses transaction pooling without changing credentials, database or SSL", () => {
  const original = new URL(sessionUrl);
  const runtime = new URL(buildRuntimeDatabaseUrl(sessionUrl, true));
  assert.equal(runtime.host, "aws-0-sa-east-1.pooler.supabase.com:6543");
  assert.equal(runtime.searchParams.get("connection_limit"), "1");
  assert.equal(runtime.searchParams.get("pgbouncer"), "true");
  assert.equal(runtime.searchParams.get("sslmode"), "require");
  assert.equal(runtime.searchParams.get("schema"), "public");
  assert.equal(runtime.username, original.username);
  assert.equal(runtime.password, original.password);
  assert.equal(runtime.pathname, original.pathname);
  assert.equal(original.port, "5432");
});

test("an existing transaction pool URL gets Prisma compatibility and one connection", () => {
  const runtime = new URL(buildRuntimeDatabaseUrl(sessionUrl.replace(":5432/", ":6543/") + "&pgbouncer=false", true));
  assert.equal(runtime.port, "6543");
  assert.equal(runtime.searchParams.get("pgbouncer"), "true");
  assert.deepEqual(runtime.searchParams.getAll("connection_limit"), ["1"]);
});

test("a Supabase shared pooler without a port also uses transaction mode", () => {
  const runtime = new URL(buildRuntimeDatabaseUrl(sessionUrl.replace(":5432/", "/"), true));
  assert.equal(runtime.port, "6543");
  assert.equal(runtime.searchParams.get("pgbouncer"), "true");
});

test("local and persistent backends keep their configured URL unchanged", () => {
  assert.equal(buildRuntimeDatabaseUrl(sessionUrl, false), sessionUrl);
});

for (const hostname of ["db.example.supabase.co", "localhost", "pooler.supabase.com.example.org"]) {
  test(`Vercel does not change the endpoint or pooling mode for ${hostname}`, () => {
    const runtime = new URL(buildRuntimeDatabaseUrl(sessionUrl.replace("aws-0-sa-east-1.pooler.supabase.com", hostname), true));
    assert.equal(runtime.hostname, hostname);
    assert.equal(runtime.port, "5432");
    assert.equal(runtime.searchParams.has("pgbouncer"), false);
    assert.equal(runtime.searchParams.get("connection_limit"), "1");
  });
}

async function loginWithDatabaseError(t, error) {
  const app = Fastify({ logger: false });
  t.after(() => app.close());
  registerErrorHandler(app);
  const service = new AuthService({ findByEmail: async () => { throw error; } });
  app.post("/auth/login", new AuthController(service).login);
  return app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "diagnostic@example.invalid", password: "fake-password" }
  });
}

const poolErrorMessage = "Error querying the database: FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15";

test("the reported initialization error without errorCode returns a safe 503 on login", async (t) => {
  const response = await loginWithDatabaseError(t, new Prisma.PrismaClientInitializationError(poolErrorMessage, "6.19.3"));
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "O sistema está temporariamente sem acesso ao banco de dados. Tente novamente mais tarde.",
      details: null
    }
  });
});

test("session exhaustion after Prisma initializes also returns 503", async (t) => {
  const response = await loginWithDatabaseError(t, new Prisma.PrismaClientUnknownRequestError(poolErrorMessage, { clientVersion: "6.19.3" }));
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, "DATABASE_UNAVAILABLE");
  assert.equal(response.json().error.details, null);
});

for (const code of ["P1001", "P2024", "P2037"]) {
  test(`database connection failure ${code} returns 503`, async (t) => {
    const error = new Prisma.PrismaClientKnownRequestError("Connection failure", { code, clientVersion: "6.19.3" });
    const response = await loginWithDatabaseError(t, error);
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error.code, "DATABASE_UNAVAILABLE");
  });
}

test("unrelated Prisma initialization errors remain internal errors without leaking details", async (t) => {
  const error = new Prisma.PrismaClientInitializationError("Missing query engine: private internal path", "6.19.3");
  const response = await loginWithDatabaseError(t, error);
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(response.json().error.details, null);
});

test("invalid credentials still return 401", async (t) => {
  const app = Fastify({ logger: false });
  t.after(() => app.close());
  registerErrorHandler(app);
  const service = new AuthService({ findByEmail: async () => null });
  app.post("/auth/login", new AuthController(service).login);
  const response = await app.inject({
    method: "POST", url: "/auth/login",
    payload: { email: "diagnostic@example.invalid", password: "fake-password" }
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "INVALID_CREDENTIALS");
});
