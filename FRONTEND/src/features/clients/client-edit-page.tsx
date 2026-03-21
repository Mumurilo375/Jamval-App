import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader } from "../../components/ui";
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
      <PageHeader
        title="Abrir cliente"
        subtitle={clientQuery.data.tradeName}
        action={
          <Link to={`/clients/${clientId}/catalog`}>
            <Button>Mix e preco</Button>
          </Link>
        }
      />
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-[var(--jam-ink)]">Mix e preco do cliente</p>
        <p className="text-sm text-[var(--jam-subtle)]">
          Abra o mix para revisar produtos ativos e preco configurado deste cliente.
        </p>
      </Card>
      <ClientForm mode="edit" client={clientQuery.data} />
    </div>
  );
}
