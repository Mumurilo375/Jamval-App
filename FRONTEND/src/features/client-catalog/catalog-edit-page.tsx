import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getClient } from "../clients/clients-api";
import { listClientCatalog } from "./catalog-api";
import { CatalogForm } from "./catalog-form";

export function CatalogEditPage() {
  const { clientId = "", clientProductId = "" } = useParams();
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId)
  });
  const catalogQuery = useQuery({
    queryKey: ["client-catalog", clientId],
    queryFn: () => listClientCatalog(clientId)
  });

  if (clientQuery.isPending || catalogQuery.isPending) {
    return <PageLoader label="Carregando item do mix..." />;
  }

  const item = catalogQuery.data?.find((entry) => entry.id === clientProductId);

  if (clientQuery.isError || catalogQuery.isError || !clientQuery.data || !item) {
    return <EmptyState title="Item nao encontrado" message="Volte para o mix do cliente e tente novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar mix e preco" subtitle={`${clientQuery.data.tradeName} · ${item.product.name}`} />
      <CatalogForm client={clientQuery.data} item={item} mode="edit" />
    </div>
  );
}
