import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getClient } from "../clients/clients-api";
import { VisitForm } from "./visit-form";
import { getVisit } from "./visits-api";

export function VisitEditPage() {
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
    return <EmptyState title="Visita nao encontrada" message="Volte para a lista e tente abrir o draft novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar metadados" subtitle={visitQuery.data.visitCode} />
      <VisitForm mode="edit" visit={visitQuery.data} client={clientQuery.data ?? null} />
    </div>
  );
}
