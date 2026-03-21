import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getVisit } from "./visits-api";
import { VisitItemForm } from "./visit-item-form";

export function VisitItemEditPage() {
  const { visitId = "", itemId = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });

  const item = useMemo(() => visitQuery.data?.items.find((entry) => entry.id === itemId), [itemId, visitQuery.data]);

  if (visitQuery.isPending) {
    return <PageLoader label="Carregando item..." />;
  }

  if (visitQuery.isError || !visitQuery.data || !item) {
    return <EmptyState title="Item nao encontrado" message="Volte para os detalhes da visita e tente novamente." />;
  }

  if (visitQuery.data.visitType === "CONSIGNMENT") {
    return <Navigate to={`/visits/${visitId}`} replace />;
  }

  if (visitQuery.data.status !== "DRAFT") {
    return <EmptyState title="Visita nao editavel" message="So visitas em rascunho aceitam ajustes de item nesta etapa." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar item" subtitle={`${item.productSnapshotName} · revise a conferencia, a cobranca e a reposicao`} />
      <VisitItemForm mode="edit" visit={visitQuery.data} productOptions={[]} item={item} />
    </div>
  );
}
