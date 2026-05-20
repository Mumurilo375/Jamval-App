import type { IncomingMessage, ServerResponse } from "node:http";

type FetchRequestInit = RequestInit & {
  duplex?: "half";
};

const DEFAULT_BACKEND_URL = "https://jamval-app-backend-8flj.vercel.app";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "BACKEND_PROXY_NOT_CONFIGURED",
          message: "Backend proxy target is not configured"
        }
      })
    );
    return;
  }

  const targetUrl = buildTargetUrl(req, backendUrl);

  try {
    const requestInit: FetchRequestInit = {
      method: req.method,
      headers: buildForwardHeaders(req),
      body: shouldForwardBody(req.method) ? (req as unknown as BodyInit) : undefined,
      duplex: "half"
    };
    const response = await fetch(targetUrl, requestInit);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });

    const setCookie = response.headers.getSetCookie?.();
    if (setCookie && setCookie.length > 0) {
      res.setHeader("set-cookie", setCookie);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "BACKEND_PROXY_ERROR",
          message: "Nao foi possivel conectar ao backend."
        }
      })
    );
  }
}

function getBackendUrl(): string {
  return (
    process.env.BACKEND_PROXY_TARGET ??
    process.env.BACKEND_URL ??
    process.env.VITE_API_PROXY_TARGET ??
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, "");
}

function buildTargetUrl(req: IncomingMessage, backendUrl: string): string {
  const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const backendPath = requestUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";

  return `${backendUrl}${backendPath}${requestUrl.search}`;
}

function buildForwardHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return headers;
}

function shouldForwardBody(method: string | undefined): boolean {
  return method !== "GET" && method !== "HEAD";
}
