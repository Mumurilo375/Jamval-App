import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, FormPage, PageLoader } from "../../components/ui";
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
    return <EmptyState title="Cliente não encontrado" message="Volte para a lista e tente abrir o mix e preço novamente." />;
  }

  return <FormPage backTo={`/clients/${clientId}/catalog`} backLabel="Mix" title="Adicionar ao mix e preço" subtitle={clientQuery.data.tradeName}>
    <CatalogForm client={clientQuery.data} mode="create" />
  </FormPage>;
}
