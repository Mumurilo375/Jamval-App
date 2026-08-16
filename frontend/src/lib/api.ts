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

const REQUEST_TIMEOUT_MS = 15_000;

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
    response = await fetchWithTimeout(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: body as BodyInit | null | undefined,
      credentials: "include"
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao backend.", null);
  }

  const text = await response.text();
  const payload = parseResponsePayload<T>(response, text);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "HTTP_ERROR",
      payload?.error?.message ?? getFallbackErrorMessage(response),
      payload?.error?.details ?? null
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Resposta inválida do backend.", text || null);
  }

  return payload.data;
}

export async function downloadApiFile(path: string, fallbackFileName: string): Promise<void> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${env.apiBaseUrl}${path}`, {
      credentials: "include"
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao backend.", null);
  }

  if (!response.ok) {
    const text = await response.text();
    const payload = parseResponsePayload<unknown>(response, text);

    throw new ApiError(
      response.status,
      payload?.error?.code ?? "HTTP_ERROR",
      payload?.error?.message ?? getFallbackErrorMessage(response),
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

export async function previewApiPdf(path: string, previewWindow: Window | null): Promise<void> {
  if (!previewWindow) {
    throw new ApiError(0, "PREVIEW_WINDOW_BLOCKED", "Não foi possível abrir a visualização do comprovante. Libere os pop-ups e tente novamente.", null);
  }

  try {
    const response = await fetchWithTimeout(`${env.apiBaseUrl}${path}`, {
      credentials: "include"
    });

    if (!response.ok) {
      const text = await response.text();
      const payload = parseResponsePayload<unknown>(response, text);

      throw new ApiError(
        response.status,
        payload?.error?.code ?? "HTTP_ERROR",
        payload?.error?.message ?? getFallbackErrorMessage(response),
        payload?.error?.details ?? null
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("application/pdf")) {
      throw new ApiError(response.status, "INVALID_FILE_TYPE", "O comprovante recebido não é um PDF válido.", null);
    }

    const objectUrl = window.URL.createObjectURL(await response.blob());
    previewWindow.location.replace(objectUrl);
    previewWindow.focus();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 60_000);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
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

function getFallbackErrorMessage(response: Response): string {
  switch (response.status) {
    case 400:
      return "Confira os dados informados e tente novamente.";
    case 401:
      return "Sua sessão expirou. Entre novamente para continuar.";
    case 403:
      return "Você não tem permissão para realizar esta ação.";
    case 404:
      return "O registro solicitado não foi encontrado.";
    case 409:
      return "Esta alteração entrou em conflito com outra atualização.";
    case 429:
      return "Muitas tentativas em sequência. Aguarde um pouco e tente novamente.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "O backend está indisponível no momento. Tente novamente em instantes.";
    default:
      return response.statusText || "Falha na requisição.";
  }
}

function parseContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallbackFileNameFromHeader(contentDisposition);
    }
  }

  return fallbackFileNameFromHeader(contentDisposition);
}

function fallbackFileNameFromHeader(contentDisposition: string): string | null {
  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1]?.trim() || null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "A conexão demorou demais. Confira sua rede e tente novamente.", null);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
