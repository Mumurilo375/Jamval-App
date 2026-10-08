import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MutationObserver, QueryClientProvider, QueryObserver, onlineManager } from "@tanstack/react-query";
import { createServer } from "vite";

let server;
let VisitDetailPage;
let ProtectedApp;
let createAppQueryClient;
let buildAutoPopulatedVisitItems;
let buildSuggestedPreviousByProductId;
let bulkUpsertVisitItems;
let handleVisitMutationSuccess;
const visitId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";
const sessionKey = ["auth", "session"];
const visitKey = ["visit", visitId];
const catalogKey = ["client-catalog", clientId, "consignment-flow"];
const historyKey = ["visits", clientId, "completed-history", "consignment-flow"];
const user = { id: "user-1", name: "Operador de teste", email: "teste@example.com", isActive: true };

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom"
  });
  ({ VisitDetailPage } = await server.ssrLoadModule("/src/features/visits/visit-detail-page.tsx"));
  ({ ProtectedApp } = await server.ssrLoadModule("/src/features/auth/route-guards.tsx"));
  ({ createAppQueryClient } = await server.ssrLoadModule("/src/app/query-client.ts"));
  ({ buildAutoPopulatedVisitItems, buildSuggestedPreviousByProductId } = await server.ssrLoadModule("/src/features/visits/visit-utils.ts"));
  ({ bulkUpsertVisitItems } = await server.ssrLoadModule("/src/features/visits/visits-api.ts"));
  ({ handleVisitMutationSuccess } = await server.ssrLoadModule("/src/features/visits/visit-flow-utils.ts"));
}, { timeout: 10_000 });

after(async () => {
  await server?.close();
});

function visitFixture(visitType = "CONSIGNMENT", status = "COMPLETED") {
  return {
    id: visitId,
    clientId,
    client: { id: clientId, tradeName: "Cliente da visita" },
    visitCode: "VIS-TESTE",
    visitType,
    status,
    visitedAt: "2026-10-08T12:00:00Z",
    receivedAmountOnVisit: 0,
    totalAmount: 0,
    items: []
  };
}

function renderPage(client, protectedRoute = false) {
  const visitRoute = React.createElement(Route, { path: "/visits/:visitId", element: React.createElement(VisitDetailPage) });
  return renderToString(
    React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: [`/visits/${visitId}`] },
        React.createElement(Routes, null,
          protectedRoute ? React.createElement(Route, { element: React.createElement(ProtectedApp) }, visitRoute) : visitRoute
        )
      )
    )
  );
}

function setupClient(t, fetchResponse, { offline = false } = {}) {
  t.mock.method(globalThis, "fetch", fetchResponse);
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previouslyOnline = onlineManager.isOnline();
  // Exercise the real API deadline quickly without changing production code.
  globalThis.window = {
    setTimeout: (callback, delay) => setTimeout(callback, delay === 30_000 ? 20 : delay),
    clearTimeout
  };
  onlineManager.setOnline(!offline);
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, gcTime: Infinity, retryOnMount: false, retryDelay: 0 }
  });
  client.mount();
  t.after(() => {
    client.unmount();
    client.clear();
    onlineManager.setOnline(previouslyOnline);
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  });
  return client;
}

function withDeadline(promise, label) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} permaneceu em loading ou pausado`)), 1_000);
    })
  ]).finally(() => clearTimeout(timeout));
}

async function observeQuery(t, client, queryKey) {
  const query = client.getQueryCache().find({ queryKey });
  assert.ok(query, `A tela deve registrar a query ${JSON.stringify(queryKey)}`);
  const observer = new QueryObserver(client, query.options);
  let unsubscribe = () => {};
  t.after(() => unsubscribe());
  const result = await withDeadline(new Promise((resolve) => {
    unsubscribe = observer.subscribe((state) => {
      if (!state.isPending && state.fetchStatus === "idle") resolve(state);
    });
    const current = observer.getCurrentResult();
    if (!current.isPending && current.fetchStatus === "idle") resolve(current);
  }), JSON.stringify(queryKey));
  unsubscribe();
  return { result, observer };
}

async function loadVisit(t, fetchResponse, options = {}) {
  const client = setupClient(t, fetchResponse, options);
  assert.match(renderPage(client), /Carregando visita/);
  const { result } = await observeQuery(t, client, visitKey);
  return { result, html: renderPage(client) };
}

for (const visitType of ["SALE", "CONSIGNMENT"]) {
  test(`carrega visita ${visitType} mesmo quando o navegador informa offline`, async (t) => {
    const visit = visitFixture(visitType);
    const { result, html } = await loadVisit(t, async () => Response.json({ data: visit }), { offline: true });
    assert.equal(result.isSuccess, true);
    assert.match(html, /Cliente da visita/);
    assert.doesNotMatch(html, /Carregando visita/);
  });
}

test("sessão, rascunho, catálogo, histórico e preenchimento conseguem acessar o backend com onlineManager false", async (t) => {
  const visit = visitFixture("CONSIGNMENT", "DRAFT");
  const catalog = [{ id: "catalog-1", productId, currentUnitPrice: 12.5, product: { id: productId, name: "Produto de teste", sku: "TESTE-1" } }];
  const history = [{ items: [{ productId, resultingClientQuantity: 7 }] }];
  const requests = [];
  let populatedVisit;
  const client = setupClient(t, async (url, options) => {
    const path = new URL(url, "http://localhost").pathname;
    requests.push(path);
    if (path.endsWith("/auth/me")) return Response.json({ data: { user } });
    if (path.endsWith(`/visits/${visitId}`)) return Response.json({ data: visit });
    if (path.endsWith(`/clients/${clientId}/products`)) return Response.json({ data: catalog });
    if (path.endsWith(`/visits/completed-history/${clientId}`)) return Response.json({ data: history });
    if (path.endsWith(`/visits/${visitId}/items/bulk-upsert`)) {
      const { items } = JSON.parse(options.body);
      assert.equal(items.length, 1);
      assert.equal(items[0].quantityPrevious, 7);
      assert.equal(items[0].quantityGoodRemaining, 7);
      assert.equal(items[0].unitPrice, 12.5);
      populatedVisit = {
        ...visit,
        items: items.map((item) => ({
          ...item, id: "item-1", productSnapshotName: "Produto de teste", productSnapshotSku: "TESTE-1",
          productSnapshotLabel: "Produto de teste", quantityExchangeOnVisit: 0, quantitySold: 0,
          subtotalAmount: 0, resultingClientQuantity: 7
        }))
      };
      return Response.json({ data: populatedVisit });
    }
    throw new Error(`Requisição inesperada: ${path}`);
  }, { offline: true });

  assert.match(renderPage(client, true), /Validando sessão/);
  const session = await observeQuery(t, client, sessionKey);
  assert.equal(session.result.isSuccess, true);
  assert.match(renderPage(client, true), /Carregando visita/);
  assert.equal((await observeQuery(t, client, visitKey)).result.isSuccess, true);
  assert.match(renderPage(client, true), /Preparando os produtos/);
  const [catalogResult, historyResult] = await Promise.all([
    observeQuery(t, client, catalogKey), observeQuery(t, client, historyKey)
  ]);
  assert.equal(catalogResult.result.isSuccess, true);
  assert.equal(historyResult.result.isSuccess, true);

  // SSR cannot run effects. Exercise the same item builder, request, cache update and mutation defaults.
  const items = buildAutoPopulatedVisitItems({
    catalogItems: catalogResult.result.data,
    suggestedPreviousByProductId: buildSuggestedPreviousByProductId(historyResult.result.data)
  });
  const mutation = new MutationObserver(client, {
    mutationFn: (payload) => bulkUpsertVisitItems(visitId, payload),
    onSuccess: handleVisitMutationSuccess(client)
  });
  await withDeadline(mutation.mutate(items), "Preenchimento da visita");
  assert.equal(mutation.getCurrentResult().isSuccess, true);
  assert.equal(mutation.getCurrentResult().isPaused, false);
  assert.deepEqual(client.getQueryData(visitKey), populatedVisit);
  const html = renderPage(client, true);
  assert.match(html, /Produto de teste/);
  assert.doesNotMatch(html, /Validando sessão|Carregando visita|Preparando os produtos/);
  assert.equal(requests.length, 5);
});

test("retry da sessão continua se o navegador passa a informar offline durante a requisição", async (t) => {
  let attempts = 0;
  const client = setupClient(t, async () => {
    attempts += 1;
    if (attempts === 1) {
      onlineManager.setOnline(false);
      throw new TypeError("Failed to fetch");
    }
    return Response.json({ data: { user } });
  });
  assert.match(renderPage(client, true), /Validando sessão/);
  const { result } = await observeQuery(t, client, sessionKey);
  assert.equal(attempts, 2);
  assert.equal(result.isSuccess, true);
  assert.equal(result.isPaused, false);
});

test("erro real de sessão permanece visível e refetch recupera a sessão mesmo offline", async (t) => {
  let available = false;
  const client = setupClient(t, async () => {
    if (!available) throw new TypeError("Failed to fetch");
    return Response.json({ data: { user } });
  }, { offline: true });
  assert.match(renderPage(client, true), /Validando sessão/);
  const { result, observer } = await observeQuery(t, client, sessionKey);
  assert.equal(result.error.code, "NETWORK_ERROR");
  const html = renderPage(client, true);
  assert.match(html, /Não foi possível validar a sessão/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Validando sessão/);
  available = true;
  const recovered = await withDeadline(observer.refetch(), "Nova tentativa da sessão");
  assert.equal(recovered.isSuccess, true);
  assert.equal(recovered.isPaused, false);
});

test("falha de conexão encerra o loading e permite tentar novamente", async (t) => {
  const { result, html } = await loadVisit(t, async () => { throw new TypeError("Failed to fetch"); }, { offline: true });
  assert.equal(result.error.code, "NETWORK_ERROR");
  assert.match(html, /Não foi possível carregar a visita/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Carregando visita/);
});

test("visita inexistente exibe a mensagem de não encontrada", async (t) => {
  const { result, html } = await loadVisit(t, async () => Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 }));
  assert.equal(result.error.status, 404);
  assert.match(html, /Visita não encontrada/);
  assert.doesNotMatch(html, /Carregando visita/);
});

test("requisição sem resposta termina no timeout e oferece nova tentativa", async (t) => {
  const { result, html } = await loadVisit(t, (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }), { offline: true });
  assert.equal(result.error.code, "REQUEST_TIMEOUT");
  assert.match(html, /O backend demorou para responder/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Carregando visita/);
});
