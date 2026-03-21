import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageLoader } from "../../components/ui";
import { getClient } from "../clients/clients-api";
import { ConsignmentVisitFlow } from "./consignment-visit-flow";
import { DirectSaleVisitFlow } from "./direct-sale-visit-flow";
import { getVisit } from "./visits-api";

export function VisitDetailPage() {
  const { visitId = "" } = useParams();
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
    return <EmptyState title="Visita nao encontrada" message="Volte para a lista de visitas e tente novamente." />;
  }

  const visit = visitQuery.data;
  const clientName = clientQuery.data?.tradeName ?? "Cliente";

  if (visit.visitType === "SALE") {
    return <DirectSaleVisitFlow visit={visit} clientName={clientName} />;
  }

  return <ConsignmentVisitFlow visit={visit} clientName={clientName} />;
}
