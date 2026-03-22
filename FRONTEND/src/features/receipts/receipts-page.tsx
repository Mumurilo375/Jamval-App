import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, PageHeader, PageLoader, PaginationControls, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { paginateItems } from "../../lib/pagination";
import { listClients } from "../clients/clients-api";
import { listVisits } from "../visits/visits-api";

const RECEIPTS_PAGE_SIZE = 6;

export function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const visitsQuery = useQuery({
    queryKey: ["receipts-page", "completed-visits"],
    queryFn: () => listVisits({ status: "COMPLETED" })
  });
  const clientsQuery = useQuery({
    queryKey: ["receipts-page", "clients"],
    queryFn: () => listClients({})
  });
  const clientNameById = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client.tradeName])),
    [clientsQuery.data]
  );
  const filteredVisits = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return (visitsQuery.data ?? []).filter((visit) => {
      if (!term) {
        return true;
      }

      const clientName = clientNameById.get(visit.clientId) ?? "";
      return `${visit.visitCode} ${clientName}`.toLocaleLowerCase().includes(term);
    });
  }, [clientNameById, search, visitsQuery.data]);
  const paginatedVisits = paginateItems(filteredVisits, page, RECEIPTS_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Documentos"
        title="Comprovantes"
        subtitle="Use esta area para encontrar visitas concluidas e abrir o detalhe que gera ou baixa o comprovante."
      />

      <Card className="space-y-3">
        <p className="text-sm text-[var(--jam-subtle)]">
          A geracao e o download do comprovante continuam acontecendo dentro da visita concluida. Aqui voce localiza rapidamente as ultimas visitas ja fechadas.
        </p>

        <Field label="Buscar visita ou cliente">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por codigo da visita ou cliente"
          />
        </Field>
      </Card>

      {visitsQuery.isPending || clientsQuery.isPending ? <PageLoader label="Carregando comprovantes..." /> : null}

      {visitsQuery.isError || clientsQuery.isError ? (
        <EmptyState title="Nao foi possivel carregar os comprovantes" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!visitsQuery.isPending && !clientsQuery.isPending && !visitsQuery.isError && !clientsQuery.isError && filteredVisits.length === 0 ? (
        <EmptyState
          title="Nenhuma visita concluida encontrada"
          message="Quando houver visitas concluidas, elas vao aparecer aqui para abrir o comprovante."
        />
      ) : null}

      <div className="space-y-3">
        {paginatedVisits.pageItems.map((visit) => (
          <Card key={visit.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">
                  {clientNameById.get(visit.clientId) ?? "Cliente"}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{visit.visitCode}</p>
              </div>
              <ToneBadge label="Concluida" tone="success" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Data</p>
                <p className="mt-1 font-semibold text-[var(--jam-ink)]">{formatDate(visit.visitedAt)}</p>
              </div>
              <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Total</p>
                <p className="mt-1 font-semibold text-[var(--jam-ink)]">{formatCurrency(Number(visit.totalAmount))}</p>
              </div>
            </div>

            <Link to={`/visits/${visit.id}`}>
              <Button className="w-full justify-between">
                <span>Abrir visita concluida</span>
                <span>→</span>
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <PaginationControls
        page={paginatedVisits.page}
        totalPages={paginatedVisits.totalPages}
        totalItems={filteredVisits.length}
        pageSize={RECEIPTS_PAGE_SIZE}
        itemLabel="comprovantes"
        onPageChange={setPage}
      />
    </div>
  );
}
