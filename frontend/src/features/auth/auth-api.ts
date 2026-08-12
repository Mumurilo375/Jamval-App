import { api, ApiError } from "../../lib/api";
import type { AuthUser } from "../../types/domain";

type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await api.post<{ user: AuthUser }>("/auth/login", payload);
  return response.user;
}

export async function logout(): Promise<void> {
  await api.post<{ loggedOut: boolean }>("/auth/logout");
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const response = await api.get<{ user: AuthUser }>("/auth/me");
    return response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}
