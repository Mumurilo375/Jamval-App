import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getClient } from "./clients-api";
import { ClientForm } from "./client-form";

export function ClientEditPage() {
  const { clientId = "" } = useParams();
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId)
  });

  if (clientQuery.isPending) {
    return <PageLoader label="Carregando cliente..." />;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return <EmptyState title="Cliente nao encontrado" message="Volte para a lista e tente abrir o cadastro novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar cliente" subtitle={clientQuery.data.tradeName} />
      <ClientForm mode="edit" client={clientQuery.data} />
    </div>
  );
}
