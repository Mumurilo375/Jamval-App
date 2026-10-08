import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider, QueryObserver, onlineManager } from "@tanstack/react-query";
import { createServer } from "vite";

let server;
let VisitDetailPage;
const visitId = "11111111-1111-4111-8111-111111111111";

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom"
  });
  ({ VisitDetailPage } = await server.ssrLoadModule("/src/features/visits/visit-detail-page.tsx"));
});

after(async () => {
  await server?.close();
});

function renderPage(client) {
  return renderToString(
    React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: [`/visits/${visitId}`] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/visits/:visitId", element: React.createElement(VisitDetailPage) })
        )
      )
    )
  );
}

async function loadVisit(t, fetchResponse, { offline = false } = {}) {
  // Speed up the API's 30-second deadline without changing production code.
  t.mock.method(globalThis, "fetch", fetchResponse);
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  globalThis.window = {
    setTimeout: (callback, delay) => setTimeout(callback, delay === 30_000 ? 20 : delay),
    clearTimeout
  };
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  });
  onlineManager.setOnline(!offline);
  // SSR renders stand in for updates of the same mounted page, not a retry on remount.
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryOnMount: false } } });
  t.after(() => {
    client.clear();
    onlineManager.setOnline(true);
  });

  assert.match(renderPage(client), /Carregando visita/);
  const query = client.getQueryCache().find({ queryKey: ["visit", visitId] });
  const observer = new QueryObserver(client, query.options);
  const result = await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("A visita permaneceu em loading")), 1_000);
    const unsubscribe = observer.subscribe((state) => {
      if (!state.isPending) {
        clearTimeout(deadline);
        unsubscribe();
        resolve(state);
      }
    });
    t.after(() => {
      clearTimeout(deadline);
      unsubscribe();
    });
  });

  return { result, html: renderPage(client) };
}

for (const visitType of ["SALE", "CONSIGNMENT"]) {
  test(`carrega visita ${visitType} mesmo quando o navegador informa offline`, async (t) => {
    const visit = {
      id: visitId,
      clientId: "22222222-2222-4222-8222-222222222222",
      client: { tradeName: "Cliente da visita" },
      visitCode: "VIS-TESTE",
      visitType,
      status: "COMPLETED",
      visitedAt: "2026-10-08T12:00:00Z",
      receivedAmountOnVisit: 0,
      totalAmount: 0,
      items: []
    };
    const { result, html } = await loadVisit(t, async () => Response.json({ data: visit }), { offline: true });
    assert.equal(result.isSuccess, true);
    assert.match(html, /Cliente da visita/);
    assert.doesNotMatch(html, /Carregando visita/);
  });
}

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
