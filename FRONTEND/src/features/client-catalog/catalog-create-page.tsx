import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getClient } from "../clients/clients-api";
import { CatalogForm } from "./catalog-form";

export function CatalogCreatePage() {
  const { clientId = "" } = useParams();
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId)
  });

  if (clientQuery.isPending) {
    return <PageLoader label="Carregando cliente..." />;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return <EmptyState title="Cliente nao encontrado" message="Volte para a lista e tente abrir o catalogo novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Novo item no catalogo" subtitle={clientQuery.data.tradeName} />
      <CatalogForm client={clientQuery.data} mode="create" />
    </div>
  );
}
