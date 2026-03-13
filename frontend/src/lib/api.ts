import { env } from "./env";

type ApiEnvelope<T> = {
  data: T;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: body as BodyInit | null | undefined,
      credentials: "include"
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Nao foi possivel conectar ao backend.", null);
  }

  const text = await response.text();
  const payload = parseResponsePayload<T>(response, text);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "HTTP_ERROR",
      payload?.error?.message ?? getFallbackErrorMessage(response, text),
      payload?.error?.details ?? null
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Resposta invalida do backend.", text || null);
  }

  return payload.data;
}

export async function downloadApiFile(path: string, fallbackFileName: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      credentials: "include"
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Nao foi possivel conectar ao backend.", null);
  }

  if (!response.ok) {
    const text = await response.text();
    const payload = parseResponsePayload<unknown>(response, text);

    throw new ApiError(
      response.status,
      payload?.error?.code ?? "HTTP_ERROR",
      payload?.error?.message ?? getFallbackErrorMessage(response, text),
      payload?.error?.details ?? null
    );
  }

  const blob = await response.blob();
  const fileName = parseContentDisposition(response.headers.get("content-disposition")) ?? fallbackFileName;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" })
};

function parseResponsePayload<T>(response: Response, text: string): (ApiEnvelope<T> & ApiErrorEnvelope) | null {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const looksLikeJson = contentType.includes("application/json") || contentType.includes("+json") || trimmed.startsWith("{") || trimmed.startsWith("[");

  if (!looksLikeJson) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ApiEnvelope<T> & ApiErrorEnvelope;
  } catch {
    return null;
  }
}

function getFallbackErrorMessage(response: Response, text: string): string {
  const trimmed = text.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  return response.statusText || "Falha na requisicao.";
}

function parseContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return fileNameMatch?.[1] ?? null;
}
