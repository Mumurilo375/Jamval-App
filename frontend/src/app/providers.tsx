import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { createAppQueryClient } from "./query-client";

const queryClient = createAppQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
