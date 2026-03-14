import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getClient } from "../clients/clients-api";
import { listClientCatalog } from "./catalog-api";

export function CatalogListPage() {
  const { clientId = "" } = useParams();
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId)
  });
  const catalogQuery = useQuery({
    queryKey: ["client-catalog", clientId],
    queryFn: () => listClientCatalog(clientId)
  });

  if (clientQuery.isPending || catalogQuery.isPending) {
    return <PageLoader label="Carregando catalogo..." />;
  }

  if (clientQuery.isError || catalogQuery.isError || !clientQuery.data) {
    return <EmptyState title="Catalogo indisponivel" message="Nao foi possivel carregar os dados desse cliente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Cadastros"
        title="Catalogo do cliente"
        subtitle={`${clientQuery.data.tradeName} · produtos ativos e preco atual`}
        action={
          <Link to={`/clients/${clientId}/catalog/new`}>
            <Button>Novo</Button>
          </Link>
        }
      />

      {catalogQuery.data.length === 0 ? (
        <EmptyState
          title="Catalogo vazio"
          message="Adicione os primeiros produtos ativos para esse ponto de venda."
          action={
            <Link to={`/clients/${clientId}/catalog/new`}>
              <Button>Adicionar produto</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {catalogQuery.data.map((item) => (
          <Card key={item.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{item.product.name}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{item.product.sku}</p>
              </div>
              <StatusBadge active={item.isActive} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Preco atual</p>
                <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(item.currentUnitPrice)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Ideal</p>
                <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{item.idealQuantity ?? "-"}</p>
              </div>
            </div>

            <Link to={`/clients/${clientId}/catalog/${item.id}/edit`}>
              <Button variant="secondary" className="w-full">
                Editar item
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
