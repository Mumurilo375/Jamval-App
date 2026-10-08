import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";

import { Button, EmptyState, PageLoader } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { ConsignmentVisitFlow } from "./consignment-visit-flow";
import { DirectSaleVisitFlow } from "./direct-sale-visit-flow";
import { getVisit } from "./visits-api";

export function VisitDetailPage() {
  const { visitId = "" } = useParams();
  const location = useLocation();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId),
    retry: false
  });
  if (visitQuery.isPending) {
    return <PageLoader label="Carregando visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data) {
    const isNotFound = visitQuery.error instanceof ApiError && visitQuery.error.status === 404;

    return (
      <EmptyState
        title={isNotFound ? "Visita não encontrada" : "Não foi possível carregar a visita"}
        message={isNotFound ? "Volte para a lista de visitas e tente novamente." : visitQuery.error?.message ?? "Tente novamente."}
        action={isNotFound ? undefined : <Button onClick={() => void visitQuery.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  const visit = visitQuery.data;
  const clientName = visit.client.tradeName;
  const backState = location.state as { backTo?: unknown; backLabel?: unknown } | null;
  const backTo = typeof backState?.backTo === "string" ? backState.backTo : "/visits";
  const backLabel = typeof backState?.backLabel === "string" ? backState.backLabel : "Visitas";

  if (visit.visitType === "SALE") {
    return <DirectSaleVisitFlow visit={visit} clientName={clientName} backTo={backTo} backLabel={backLabel} />;
  }

  return <ConsignmentVisitFlow visit={visit} clientName={clientName} backTo={backTo} backLabel={backLabel} />;
}
