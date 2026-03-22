import { Link } from "react-router-dom";

import { Button, Card, EmptyState, ErrorBanner, ToneBadge } from "../../components/ui";
import { cx } from "../../lib/cx";
import { formatCurrency, formatDate } from "../../lib/format";
import type {
  OperationalHistoryVisit,
  OperationalInProgressVisit,
  OperationalReturnQueueItem,
  VisitType
} from "../../types/domain";
import {
  formatDaysSince,
  formatReturnQueueSummary,
  historyActionLabel
} from "./operational-queue-utils";
import { visitTypeLabel } from "./visit-utils";

export function StartVisitErrorBanner({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  const message = error instanceof Error ? error.message : "Nao foi possivel iniciar o acerto agora.";
  return <ErrorBanner message={message} />;
}

export function ReturnQueueList({
  items,
  emptyTitle,
  emptyMessage,
  onStartVisit,
  pendingClientId
}: {
  items: OperationalReturnQueueItem[];
  emptyTitle: string;
  emptyMessage: string;
  onStartVisit: (clientId: string) => void | Promise<void>;
  pendingClientId?: string | null;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <Card className="divide-y divide-[var(--jam-border)] overflow-hidden p-0">
      {items.map((item) => (
        <article key={item.clientId} className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{item.clientName}</p>
                <p className="mt-1 truncate text-sm text-[var(--jam-subtle)]">
                  Ultima base em {formatDate(item.lastVisitAt)} • {formatDaysSince(item.lastVisitAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[rgba(29,78,216,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-accent)]">
                  Fila de retorno
                </span>
                <p className="text-sm text-[var(--jam-subtle)]">{formatReturnQueueSummary(item)}</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 border-t border-[var(--jam-border)] pt-3 sm:w-auto sm:min-w-[180px] sm:border-t-0 sm:pt-0">
              <Button
                className="w-full sm:min-w-[160px]"
                disabled={pendingClientId === item.clientId}
                onClick={() => {
                  void onStartVisit(item.clientId);
                }}
              >
                {pendingClientId === item.clientId ? "Abrindo..." : "Iniciar acerto"}
              </Button>
            </div>
          </div>
        </article>
      ))}
    </Card>
  );
}

export function InProgressList({
  items,
  emptyTitle,
  emptyMessage
}: {
  items: OperationalInProgressVisit[];
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <Card className="divide-y divide-[var(--jam-border)] overflow-hidden p-0">
      {items.map((item) => (
        <article key={item.visitId} className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{item.clientName}</p>
                <p className="mt-1 truncate text-sm text-[var(--jam-subtle)]">
                  {item.visitCode} • {formatDate(item.visitedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <VisitTypeBadge visitType={item.visitType} />
                <ToneBadge label="Nao finalizada" tone="warning" />
                <p className="text-sm text-[var(--jam-subtle)]">
                  {item.itemCount === 0 ? "Sem itens ainda" : `${formatItemCount(item.itemCount)} na visita`}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 border-t border-[var(--jam-border)] pt-3 sm:w-auto sm:min-w-[200px] sm:border-t-0 sm:pt-0 sm:text-right">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Proximo passo</p>
                <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{item.nextStepLabel}</p>
              </div>

              <Link to={`/visits/${item.visitId}`} className="w-full sm:w-auto">
                <Button className="w-full sm:min-w-[160px]">Continuar</Button>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </Card>
  );
}

export function HistoryList({
  items,
  emptyTitle,
  emptyMessage
}: {
  items: OperationalHistoryVisit[];
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <Card className="divide-y divide-[var(--jam-border)] overflow-hidden p-0">
      {items.map((item) => (
        <article key={item.visitId} className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{item.clientName}</p>
                <p className="mt-1 truncate text-sm text-[var(--jam-subtle)]">
                  {item.visitCode} • {formatDate(item.completedAt ?? item.visitedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <VisitTypeBadge visitType={item.visitType} />
                <ToneBadge label="Concluida" tone="success" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--jam-subtle)]">
                <span>Total {formatCurrency(item.totalAmount)}</span>
                <span>Recebido {formatCurrency(item.receivedAmount)}</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 border-t border-[var(--jam-border)] pt-3 sm:w-auto sm:min-w-[160px] sm:border-t-0 sm:pt-0">
              <Link to={`/visits/${item.visitId}`} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:min-w-[140px]">
                  {historyActionLabel(item)}
                </Button>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </Card>
  );
}

export function QueueSegmentControl({
  value,
  onChange,
  counts
}: {
  value: "return" | "in-progress" | "history";
  onChange: (value: "return" | "in-progress" | "history") => void;
  counts: {
    return: number;
    inProgress: number;
    history: number;
  };
}) {
  const options: Array<{
    value: "return" | "in-progress" | "history";
    label: string;
    count: number;
  }> = [
    { value: "return", label: "Fila de retorno", count: counts.return },
    { value: "in-progress", label: "Em andamento", count: counts.inProgress },
    { value: "history", label: "Historico", count: counts.history }
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-xl border px-3 py-3 text-left transition",
            value === option.value
              ? "border-[var(--jam-accent)] bg-[rgba(29,78,216,0.08)]"
              : "border-[var(--jam-border)] bg-white"
          )}
        >
          <p
            className={cx(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              value === option.value ? "text-[var(--jam-accent)]" : "text-[var(--jam-subtle)]"
            )}
          >
            {option.label}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{option.count}</p>
        </button>
      ))}
    </div>
  );
}

function formatItemCount(itemCount: number): string {
  return itemCount === 1 ? "1 item" : `${itemCount} itens`;
}

function VisitTypeBadge({ visitType }: { visitType: VisitType }) {
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        visitType === "SALE"
          ? "bg-[rgba(15,118,110,0.1)] text-[var(--jam-success)]"
          : "bg-[rgba(29,78,216,0.08)] text-[var(--jam-accent)]"
      )}
    >
      {visitTypeLabel(visitType)}
    </span>
  );
}
