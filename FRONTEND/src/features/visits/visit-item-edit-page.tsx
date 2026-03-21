import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";

import { EmptyState, PageLoader } from "../../components/ui";
import { getVisit } from "./visits-api";

export function VisitItemEditPage() {
  const { visitId = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });

  if (visitQuery.isPending) {
    return <PageLoader label="Redirecionando..." />;
  }

  if (visitQuery.isError || !visitQuery.data) {
    return <EmptyState title="Item nao encontrado" message="Volte para os detalhes da visita e tente novamente." />;
  }

  return <Navigate to={`/visits/${visitId}`} replace />;
}
