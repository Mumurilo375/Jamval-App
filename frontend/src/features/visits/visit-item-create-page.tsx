import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { listClientCatalog } from "../client-catalog/catalog-api";
import { getVisit } from "./visits-api";
import { VisitItemForm } from "./visit-item-form";

export function VisitItemCreatePage() {
  const { visitId = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });
  const catalogQuery = useQuery({
    queryKey: ["client-catalog", visitQuery.data?.clientId, "visit-create"],
    queryFn: () => listClientCatalog(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  const availableCatalogItems = useMemo(() => {
    if (!catalogQuery.data || !visitQuery.data) {
      return [];
    }

    const usedProductIds = new Set(visitQuery.data.items.map((item) => item.productId));
    return catalogQuery.data.filter((entry) => !usedProductIds.has(entry.productId));
  }, [catalogQuery.data, visitQuery.data]);

  if (visitQuery.isPending || catalogQuery.isPending) {
    return <PageLoader label="Carregando item da visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data || catalogQuery.isError) {
    return <EmptyState title="Visita indisponivel" message="Volte para o draft e tente novamente." />;
  }

  if (visitQuery.data.status !== "DRAFT") {
    return <EmptyState title="Visita nao editavel" message="So visitas DRAFT aceitam novos itens nesta etapa." />;
  }

  if (availableCatalogItems.length === 0) {
    return <EmptyState title="Sem produtos disponiveis" message="Todos os itens do catalogo ja estao na visita ou o cliente ainda nao tem catalogo ativo." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Novo item da visita" subtitle={visitQuery.data.visitCode} />
      <VisitItemForm mode="create" visit={visitQuery.data} catalogItems={availableCatalogItems} />
    </div>
  );
}
