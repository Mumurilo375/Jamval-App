import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../lib/api";
import type { AuthUser } from "../../types/domain";
import { getMe, login, logout } from "./auth-api";

export const authQueryKey = ["auth", "session"] as const;
const sensitiveQueryKeys = [
  ["operation-home"],
  ["clients"],
  ["client"],
  ["products"],
  ["product"],
  ["stock"],
  ["visits"],
  ["visit"],
  ["client-catalog"]
] as const;

export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: getMe,
    staleTime: 1000 * 60 * 5
  });
}

export function useSessionUser(): AuthUser | null {
  return useAuthSession().data ?? null;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      await login(payload);
      const user = await getMe();

      if (!user) {
        throw new ApiError(401, "SESSION_NOT_CONFIRMED", "Nao foi possivel confirmar a sessao apos o login.", null);
      }

      return user;
    },
    onSuccess: async (user) => {
      queryClient.setQueryData(authQueryKey, user);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authQueryKey }),
        ...sensitiveQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      ]);
      await navigate("/", { replace: true });
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(authQueryKey, null);
      await navigate("/login", { replace: true });
    }
  });
}
