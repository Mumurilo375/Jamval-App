const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const env = {
  apiBaseUrl: rawApiBaseUrl && rawApiBaseUrl.length > 0 ? rawApiBaseUrl.replace(/\/+$/, "") : "http://127.0.0.1:3333"
};
