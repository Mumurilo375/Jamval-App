import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import type { AuthUser } from "../../types/domain";
import { getMe, login, logout } from "./auth-api";

export const authQueryKey = ["auth", "session"] as const;

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
    mutationFn: login,
    onSuccess: async (user) => {
      queryClient.setQueryData(authQueryKey, user);
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
