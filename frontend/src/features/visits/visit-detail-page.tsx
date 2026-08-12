import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";

import { EmptyState, PageLoader } from "../../components/ui";
import { getClient } from "../clients/clients-api";
import { ConsignmentVisitFlow } from "./consignment-visit-flow";
import { DirectSaleVisitFlow } from "./direct-sale-visit-flow";
import { getVisit } from "./visits-api";

export function VisitDetailPage() {
  const { visitId = "" } = useParams();
  const location = useLocation();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });
  const clientQuery = useQuery({
    queryKey: ["client", visitQuery.data?.clientId],
    queryFn: () => getClient(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  if (visitQuery.isPending || clientQuery.isPending) {
    return <PageLoader label="Carregando visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data || clientQuery.isError) {
    return <EmptyState title="Visita não encontrada" message="Volte para a lista de visitas e tente novamente." />;
  }

  const visit = visitQuery.data;
  const clientName = clientQuery.data?.tradeName ?? "Cliente";
  const backState = location.state as { backTo?: unknown; backLabel?: unknown } | null;
  const backTo = typeof backState?.backTo === "string" ? backState.backTo : "/visits";
  const backLabel = typeof backState?.backLabel === "string" ? backState.backLabel : "Visitas";

  if (visit.visitType === "SALE") {
    return <DirectSaleVisitFlow visit={visit} clientName={clientName} backTo={backTo} backLabel={backLabel} />;
  }

  return <ConsignmentVisitFlow visit={visit} clientName={clientName} backTo={backTo} backLabel={backLabel} />;
}
