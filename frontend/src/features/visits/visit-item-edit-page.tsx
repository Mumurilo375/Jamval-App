import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { listClientCatalog } from "../client-catalog/catalog-api";
import { getVisit } from "./visits-api";
import { VisitItemForm } from "./visit-item-form";

export function VisitItemEditPage() {
  const { visitId = "", itemId = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });
  const catalogQuery = useQuery({
    queryKey: ["client-catalog", visitQuery.data?.clientId, "visit-edit"],
    queryFn: () => listClientCatalog(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  const item = useMemo(() => visitQuery.data?.items.find((entry) => entry.id === itemId), [itemId, visitQuery.data]);

  if (visitQuery.isPending || catalogQuery.isPending) {
    return <PageLoader label="Carregando item..." />;
  }

  if (visitQuery.isError || !visitQuery.data || catalogQuery.isError || !item) {
    return <EmptyState title="Item nao encontrado" message="Volte para os detalhes da visita e tente novamente." />;
  }

  if (visitQuery.data.status !== "DRAFT") {
    return <EmptyState title="Visita nao editavel" message="So visitas DRAFT aceitam ajustes de item nesta etapa." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar item" subtitle={item.productSnapshotName} />
      <VisitItemForm mode="edit" visit={visitQuery.data} catalogItems={catalogQuery.data ?? []} item={item} />
    </div>
  );
}
