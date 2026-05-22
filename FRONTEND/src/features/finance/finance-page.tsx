import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, ListSkeleton, PageHeader, PaginationControls, RetryableErrorState, ToneBadge } from "../../components/ui";
import { formatCount, formatCurrency, formatDate } from "../../lib/format";
import { paginateItems } from "../../lib/pagination";
import { listReceivables } from "./finance-api";
import {
  buildReceivableRoute,
  financeQueueStatusOptions,
  normalizeFinanceQueueStatus,
  receivableOriginLabel,
  receivableStatusLabel,
  receivableStatusTone,
  sortReceivablesForQueue
} from "./finance-utils";

const RECEIVABLES_PAGE_SIZE = 6;

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const activeStatus = normalizeFinanceQueueStatus(searchParams.get("status"));
  const search = searchParams.get("search") ?? "";
  const deferredSearch = useDeferredValue(search);

  const receivablesQuery = useQuery({
    queryKey: ["finance", "receivables", activeStatus],
    queryFn: () => listReceivables({ status: activeStatus })
  });

  const receivables = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
    const baseReceivables = receivablesQuery.data ?? [];
    const filteredReceivables = normalizedSearch
      ? baseReceivables.filter((receivable) =>
          `${receivable.client.tradeName} ${receivable.visit.visitCode} ${receivableOriginLabel(receivable.visit.visitType)}`
            .toLocaleLowerCase()
            .includes(normalizedSearch)
        )
      : baseReceivables;

    return sortReceivablesForQueue(filteredReceivables);
  }, [deferredSearch, receivablesQuery.data]);
  const outstandingTotal = useMemo(
    () => receivables.reduce((total, receivable) => total + receivable.amountOutstanding, 0),
    [receivables]
  );
  const paginatedReceivables = paginateItems(receivables, page, RECEIVABLES_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Financeiro"
        title="Receber"
        subtitle={`${formatCount(receivables.length, "titulo")} • ${formatCurrency(outstandingTotal)} em saldo`}
      />

      <div className="grid grid-cols-3 gap-2">
        {financeQueueStatusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={activeStatus === option.value}
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set("status", option.value);
              setPage(1);
              setSearchParams(nextParams, { replace: true });
            }}
            className={[
              "rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition sm:text-[12px]",
              activeStatus === option.value
                ? "border-[var(--jam-accent)] bg-[var(--jam-accent)] text-white"
                : "border-[var(--jam-border)] bg-white text-[var(--jam-subtle)]"
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field label="Buscar na fila">
            <Input
              value={search}
              onChange={(event) => {
                const nextParams = new URLSearchParams(searchParams);
                if (event.target.value.trim()) {
                  nextParams.set("search", event.target.value);
                } else {
                  nextParams.delete("search");
                }
                setPage(1);
                setSearchParams(nextParams, { replace: true });
              }}
              placeholder="Cliente, código da visita ou origem"
              autoComplete="off"
            />
          </Field>
          {search.trim().length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="border border-[var(--jam-border)]"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete("search");
                setPage(1);
                setSearchParams(nextParams, { replace: true });
              }}
            >
              Limpar busca
            </Button>
          ) : null}
        </div>
      </Card>

      {receivablesQuery.isPending ? <ListSkeleton rows={4} /> : null}

      {receivablesQuery.isError ? (
        <RetryableErrorState
          title="Não foi possível carregar o receber"
          message="Confira a conexão com o backend e tente novamente."
          onRetry={() => void receivablesQuery.refetch()}
        />
      ) : null}

      {!receivablesQuery.isPending && !receivablesQuery.isError && receivables.length === 0 ? (
        <EmptyState
          title="Nenhum título nesta fila"
          message={search.trim().length > 0 ? "Nenhum recebimento combina com a busca atual." : resolveEmptyMessage(activeStatus)}
        />
      ) : null}

      {!receivablesQuery.isPending && !receivablesQuery.isError && receivables.length > 0 ? (
        <div className="space-y-2.5 lg:hidden">
          {paginatedReceivables.pageItems.map((receivable) => (
            <Link
              key={receivable.id}
              to={buildReceivableRoute(receivable.id, activeStatus)}
              className="block rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[rgba(29,78,216,0.18)] sm:px-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                    {receivable.client.tradeName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--jam-subtle)]">
                    <span>{receivableOriginLabel(receivable.visit.visitType)}</span>
                    <span aria-hidden="true">•</span>
                    <span>{formatDate(receivable.visit.visitedAt)}</span>
                  </div>
                </div>

                <ToneBadge
                  label={receivableStatusLabel(receivable.status)}
                  tone={receivableStatusTone(receivable.status)}
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <QueueMetric label="Total" value={formatCurrency(receivable.originalAmount)} />
                <QueueMetric label="Recebido" value={formatCurrency(receivable.amountReceived)} />
                <QueueMetric label="Saldo" value={formatCurrency(receivable.amountOutstanding)} />
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {paginatedReceivables.pageItems.length > 0 ? (
        <Card className="hidden overflow-hidden p-0 lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Recebido</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--jam-border)]">
              {paginatedReceivables.pageItems.map((receivable) => (
                <tr key={receivable.id} className="transition hover:bg-[rgba(29,78,216,0.04)]">
                  <td className="px-4 py-3">
                    <Link to={buildReceivableRoute(receivable.id, activeStatus)} className="block">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{receivable.client.tradeName}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--jam-subtle)]">{receivable.visit.visitCode}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{receivableOriginLabel(receivable.visit.visitType)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{formatDate(receivable.visit.visitedAt)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-ink)]">{formatCurrency(receivable.originalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-ink)]">{formatCurrency(receivable.amountReceived)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(receivable.amountOutstanding)}</td>
                  <td className="px-4 py-3">
                    <ToneBadge label={receivableStatusLabel(receivable.status)} tone={receivableStatusTone(receivable.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <PaginationControls
        page={paginatedReceivables.page}
        totalPages={paginatedReceivables.totalPages}
        totalItems={receivables.length}
        pageSize={RECEIVABLES_PAGE_SIZE}
        itemLabel="titulos"
        onPageChange={setPage}
      />
    </div>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function resolveEmptyMessage(status: "PENDING" | "PARTIAL" | "PAID") {
  if (status === "PARTIAL") {
    return "Não há recebimentos parciais para tratar agora.";
  }

  if (status === "PAID") {
    return "Nenhum título quitado encontrado neste momento.";
  }

  return "Não há títulos em aberto para receber agora.";
}
