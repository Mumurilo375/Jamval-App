import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Connectivity events can be stale; let the API request and its timeout decide.
        networkMode: "always"
      },
      mutations: {
        networkMode: "always"
      }
    }
  });
}
