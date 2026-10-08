import type { QueryClient } from "@tanstack/react-query";

import type { VisitDetail } from "../../types/domain";

export const paymentMethods = ["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export const formatPaymentMethod = (method: (typeof paymentMethods)[number]) => ({
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro"
})[method];

export function handleVisitMutationSuccess(queryClient: QueryClient) {
  return async (visit: VisitDetail) => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
    queryClient.setQueryData(["visit", visit.id], visit);
  };
}
