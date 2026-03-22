import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader, PaginationControls, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
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

  const receivablesQuery = useQuery({
    queryKey: ["finance", "receivables", activeStatus],
    queryFn: () => listReceivables({ status: activeStatus })
  });

  const receivables = useMemo(
    () => sortReceivablesForQueue(receivablesQuery.data ?? []),
    [receivablesQuery.data]
  );
  const paginatedReceivables = paginateItems(receivables, page, RECEIVABLES_PAGE_SIZE);

  if (receivablesQuery.isPending) {
    return <PageLoader label="Carregando fila de recebimento..." />;
  }

  if (receivablesQuery.isError) {
    return (
      <EmptyState
        title="Nao foi possivel carregar o receber"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Financeiro"
        title="Receber"
        subtitle="Abra o titulo certo, registre o valor recebido e siga para o proximo cliente."
      />

      <div className="grid grid-cols-3 gap-2">
        {financeQueueStatusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
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

      {receivables.length === 0 ? (
        <EmptyState
          title="Nenhum titulo nesta fila"
          message={resolveEmptyMessage(activeStatus)}
        />
      ) : (
        <div className="space-y-2.5">
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
      )}

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
    return "Nao ha recebimentos parciais para tratar agora.";
  }

  if (status === "PAID") {
    return "Nenhum titulo quitado encontrado neste momento.";
  }

  return "Nao ha titulos em aberto para receber agora.";
}
