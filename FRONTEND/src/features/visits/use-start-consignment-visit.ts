import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../lib/api";
import { createVisit } from "./visits-api";

type StartVisitErrorDetails = {
  visitId?: string;
};

export function useStartConsignmentVisit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (clientId: string) =>
      createVisit({
        clientId,
        visitType: "CONSIGNMENT"
      }),
    onSuccess: async (visit) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visits"] }),
        queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] })
      ]);
      queryClient.setQueryData(["visit", visit.id], visit);
      await navigate(`/visits/${visit.id}`);
    }
  });

  const startVisit = async (clientId: string) => {
    try {
      await mutation.mutateAsync(clientId);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VISIT_ALREADY_OPEN") {
        const visitId = (error.details as StartVisitErrorDetails | null)?.visitId;

        if (visitId) {
          await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
          await navigate(`/visits/${visitId}`);
          return;
        }
      }

      throw error;
    }
  };

  return {
    startVisit,
    isPending: mutation.isPending,
    pendingClientId: mutation.isPending ? (mutation.variables ?? null) : null,
    error: mutation.error,
    reset: mutation.reset
  };
}
