import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { listClientCatalog } from "../client-catalog/catalog-api";
import { listProducts } from "../products/products-api";
import { buildSuggestedPreviousByProductId } from "./visit-utils";
import { getVisit, listCompletedVisitHistoryDetails } from "./visits-api";
import { VisitItemForm, type VisitSelectableProduct } from "./visit-item-form";

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
  const productsQuery = useQuery({
    queryKey: ["products", "visit-create-options"],
    queryFn: () => listProducts({ isActive: true })
  });
  const completedVisitsQuery = useQuery({
    queryKey: ["visits", visitQuery.data?.clientId, "completed-history"],
    queryFn: () => listCompletedVisitHistoryDetails(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  const availableProducts = useMemo<VisitSelectableProduct[]>(() => {
    if (!productsQuery.data || !visitQuery.data) {
      return [];
    }

    const catalogByProductId = new Map((catalogQuery.data ?? []).map((entry) => [entry.productId, entry]));
    const usedProductIds = new Set(visitQuery.data.items.map((item) => item.productId));
    return productsQuery.data
      .filter((product) => !usedProductIds.has(product.id))
      .map((product) => {
        const catalogItem = catalogByProductId.get(product.id);

        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice: catalogItem?.currentUnitPrice ?? product.basePrice,
          clientProductId: catalogItem?.id ?? null
        };
      });
  }, [catalogQuery.data, productsQuery.data, visitQuery.data]);
  const suggestedPreviousByProductId = useMemo(
    () => buildSuggestedPreviousByProductId(completedVisitsQuery.data ?? []),
    [completedVisitsQuery.data]
  );

  if (visitQuery.isPending || catalogQuery.isPending || productsQuery.isPending) {
    return <PageLoader label="Carregando item da visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data || catalogQuery.isError || productsQuery.isError) {
    return <EmptyState title="Visita indisponivel" message="Volte para o rascunho e tente novamente." />;
  }

  if (visitQuery.data.visitType === "CONSIGNMENT") {
    return <Navigate to={`/visits/${visitId}`} replace />;
  }

  if (visitQuery.data.status !== "DRAFT") {
    return <EmptyState title="Visita nao editavel" message="So visitas em rascunho aceitam novos itens nesta etapa." />;
  }

  if (availableProducts.length === 0) {
    return <EmptyState title="Sem produtos disponiveis" message="Todos os produtos ativos ja estao na visita ou ainda nao ha produtos cadastrados." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Novo item da visita" subtitle={`${visitQuery.data.visitCode} · comece por "Anterior no cliente" e confira o que restou na loja`} />
      <VisitItemForm
        mode="create"
        visit={visitQuery.data}
        productOptions={availableProducts}
        suggestedPreviousByProductId={suggestedPreviousByProductId}
      />
    </div>
  );
}
