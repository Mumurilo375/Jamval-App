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

const API_REQUEST_TIMEOUT_MS = 30_000;

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

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: body as BodyInit | null | undefined,
      signal: controller.signal,
      credentials: "include"
    });

    const text = await response.text();
    const payload = parseResponsePayload<T>(response, text);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload?.error?.code ?? "HTTP_ERROR",
        getLocalizedErrorMessage(response.status, payload?.error?.code ?? "HTTP_ERROR"),
        payload?.error?.details ?? null
      );
    }

    if (!payload || !("data" in payload)) {
      throw new ApiError(response.status, "INVALID_RESPONSE", "Resposta inválida do backend.", text || null);
    }

    return payload.data;
  } catch (error) {
    if (timedOut) {
      throw new ApiError(0, "REQUEST_TIMEOUT", "O backend demorou para responder. Tente novamente.", null);
    }

    if (options.signal?.aborted) {
      throw error;
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao backend.", null);
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function downloadApiFile(path: string, fallbackFileName: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
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
      getLocalizedErrorMessage(response.status, payload?.error?.code ?? "HTTP_ERROR"),
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
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      credentials: "include"
    });

    if (!response.ok) {
      const text = await response.text();
      const payload = parseResponsePayload<unknown>(response, text);

      throw new ApiError(
        response.status,
        payload?.error?.code ?? "HTTP_ERROR",
        getLocalizedErrorMessage(response.status, payload?.error?.code ?? "HTTP_ERROR"),
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

function getLocalizedErrorMessage(status: number, code: string): string {
  if (code === "DATABASE_UNAVAILABLE") {
    return "O sistema está temporariamente sem acesso ao banco de dados. Tente novamente mais tarde.";
  }

  if (code === "NETWORK_ERROR") {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  if (code === "INVALID_CREDENTIALS") {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (code === "VALIDATION_ERROR" || status === 400) {
    return "Não foi possível processar os dados informados. Revise os campos e tente novamente.";
  }

  if (status === 401) {
    return "Não foi possível autenticar. Confira seus dados e tente novamente.";
  }

  if (status === 403) {
    return "Você não tem permissão para realizar esta ação.";
  }

  if (status === 404) {
    return "O conteúdo solicitado não foi encontrado. Atualize a página e tente novamente.";
  }

  if (status === 409) {
    return "Esta ação não pode ser concluída porque os dados foram alterados. Atualize a página e tente novamente.";
  }

  if (status >= 500) {
    return "Não foi possível concluir esta operação agora. O serviço pode estar temporariamente indisponível. Tente novamente em instantes.";
  }

  return "Ocorreu um erro ao realizar esta ação. Tente novamente.";
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
