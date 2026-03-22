import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, PaginationControls, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { paginateItems } from "../../lib/pagination";
import { getClient } from "../clients/clients-api";
import { listClientCatalog } from "./catalog-api";

const CATALOG_PAGE_SIZE = 6;

export function CatalogListPage() {
  const { clientId = "" } = useParams();

  return <CatalogListPageContent key={clientId} clientId={clientId} />;
}

function CatalogListPageContent({ clientId }: { clientId: string }) {
  const [page, setPage] = useState(1);
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId)
  });
  const catalogQuery = useQuery({
    queryKey: ["client-catalog", clientId],
    queryFn: () => listClientCatalog(clientId)
  });
  const catalogItems = catalogQuery.data ?? [];
  const paginatedCatalog = paginateItems(catalogItems, page, CATALOG_PAGE_SIZE);

  if (clientQuery.isPending || catalogQuery.isPending) {
    return <PageLoader label="Carregando mix e preco..." />;
  }

  if (clientQuery.isError || catalogQuery.isError || !clientQuery.data) {
    return <EmptyState title="Mix indisponivel" message="Nao foi possivel carregar os dados desse cliente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Clientes"
        title="Mix e preco"
        subtitle={clientQuery.data.tradeName}
        action={
          <Link to={`/clients/${clientId}/catalog/new`}>
            <Button>Adicionar produto</Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[var(--jam-ink)]">Isto define mix e preco do cliente.</p>
        <p className="text-sm text-[var(--jam-subtle)]">Nao mostra o estoque fisico atual da loja.</p>
      </Card>

      {catalogItems.length === 0 ? (
        <EmptyState
          title="Mix vazio"
          message="Adicione os primeiros produtos ao mix e preco deste cliente."
          action={
            <Link to={`/clients/${clientId}/catalog/new`}>
              <Button>Adicionar produto</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {paginatedCatalog.pageItems.map((item) => (
          <Card key={item.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{item.product.name}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{item.product.sku}</p>
              </div>
              <StatusBadge active={item.isActive} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Preco configurado</p>
              <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(item.currentUnitPrice)}</p>
            </div>

            <details className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--jam-ink)]">
                Mais ajustes
              </summary>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Quantidade ideal</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{item.idealQuantity ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Ordem</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{item.displayOrder ?? "-"}</p>
                </div>
              </div>

              <div className="mt-3">
                <Link to={`/clients/${clientId}/catalog/${item.id}/edit`}>
                  <Button variant="secondary" className="w-full">
                    Editar mix e preco
                  </Button>
                </Link>
              </div>
            </details>
          </Card>
        ))}
      </div>

      <PaginationControls
        page={paginatedCatalog.page}
        totalPages={paginatedCatalog.totalPages}
        totalItems={catalogItems.length}
        pageSize={CATALOG_PAGE_SIZE}
        itemLabel="produtos"
        onPageChange={setPage}
      />
    </div>
  );
}
