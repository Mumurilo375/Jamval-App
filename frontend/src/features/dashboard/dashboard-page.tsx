import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  Button,
  Card,
  ListSkeleton,
  PageHeader,
  RetryableErrorState,
  SectionHeader,
} from "../../components/ui";
import { formatCount } from "../../lib/format";
import { cx } from "../../lib/cx";
import {
  HistoryList,
  InProgressList,
  ReturnQueueList,
  StartVisitErrorBanner,
} from "../visits/operational-queue";
import { useStartConsignmentVisit } from "../visits/use-start-consignment-visit";
import { listOperationalVisitQueue } from "../visits/visits-api";

export function DashboardPage() {
  const queueQuery = useQuery({
    queryKey: ["visits", "operational-queue"],
    queryFn: () => listOperationalVisitQueue(),
  });
  const startVisit = useStartConsignmentVisit();

  if (queueQuery.isPending) {
    return <ListSkeleton rows={5} />;
  }

  if (queueQuery.isError || !queueQuery.data) {
    return (
      <RetryableErrorState
        title="Não foi possível montar a fila do dia"
        message="Confira a conexão com o backend e tente novamente."
        onRetry={() => void queueQuery.refetch()}
      />
    );
  }

  const queue = queueQuery.data;
  const mainAction = queue.mainAction;
  const hasOpenVisit = mainAction.mode === "continue" && mainAction.visitId;
  const returnCount = queue.returnQueue.length;
  const inProgressCount = queue.inProgress.length;
  const historyCount = queue.recentHistory.length;
  const mainActionTitle = hasOpenVisit
    ? "Continuar atendimento em aberto"
    : "Nova visita";
  const mainActionSubtitle = hasOpenVisit
    ? `${mainAction.clientName ?? "Cliente"} • ${mainAction.visitCode ?? ""}`
    : "Sem atendimento em aberto.";
  const mainActionHref = hasOpenVisit
    ? `/visits/${mainAction.visitId}`
    : "/visits/new";
  const mainActionLabel = hasOpenVisit ? "Continuar" : "Nova visita";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Fila do dia"
        subtitle="Comece pela próxima ação; o restante fica organizado abaixo."
      />

      <Card className="space-y-4 border-[var(--jam-accent-border)] bg-[var(--jam-accent-wash)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-accent)]">Próxima ação</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--jam-ink)] sm:text-2xl">{mainActionTitle}</h2>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">{mainActionSubtitle}</p>
          </div>

          <Link to={mainActionHref} className="shrink-0">
            <Button className="w-full px-5 sm:w-auto">{mainActionLabel}</Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[var(--jam-accent-border)] pt-3">
          <QueueSignal label="Retornos" value={returnCount} tone="attention" />
          <QueueSignal label="Abertas" value={inProgressCount} tone="active" />
          <QueueSignal label="Recentes" value={historyCount} tone="done" />
        </div>
      </Card>

      <StartVisitErrorBanner error={startVisit.error} />

      <section className="space-y-3">
        <SectionHeader
          title="Fila de retorno"
          subtitle={`${formatCount(returnCount, "cliente")} aguardando acerto`}
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">Abrir organizador</Button>
            </Link>
          }
        />

        <ReturnQueueList
          items={queue.returnQueue.slice(0, 5)}
          emptyTitle="Nenhum cliente na fila de retorno"
          emptyMessage="Quando uma base de consignação estiver aguardando nova conferência, ela aparece aqui."
          onStartVisit={startVisit.startVisit}
          pendingClientId={startVisit.pendingClientId}
        />
      </section>

      <details className="group rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-[var(--jam-ink)]">Em andamento</span>
            <span className="mt-1 block text-xs text-[var(--jam-subtle)]">{formatCount(inProgressCount, "visita")} para continuar</span>
          </span>
          <span className="rounded-full bg-[var(--jam-warning-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--jam-warning)]">{inProgressCount}</span>
        </summary>
        <div className="border-t border-[var(--jam-border)] p-3">
          <InProgressList
            items={queue.inProgress.slice(0, 5)}
            emptyTitle="Nada em andamento agora"
            emptyMessage="Quando você abrir uma visita e ainda não concluir, ela aparece aqui."
          />
        </div>
      </details>

      <details className="group rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-[var(--jam-ink)]">Histórico recente</span>
            <span className="mt-1 block text-xs text-[var(--jam-subtle)]">Consulte visitas já concluídas</span>
          </span>
          <span className="rounded-full bg-[var(--jam-success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--jam-success)]">{historyCount}</span>
        </summary>
        <div className="space-y-3 border-t border-[var(--jam-border)] p-3">
          <HistoryList
            items={queue.recentHistory.slice(0, 5)}
            emptyTitle="Nenhuma visita concluída ainda"
            emptyMessage="As visitas concluídas vão aparecer aqui para consulta rápida."
          />
          <Link to="/visits" className="inline-flex text-sm font-semibold text-[var(--jam-accent)]">Ver histórico completo</Link>
        </div>
      </details>

      <section className="space-y-3">
        <SectionHeader title="Acessos rápidos" subtitle="Cadastros e conferências fora da fila de hoje" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ShortcutLink to="/financeiro" title="Financeiro" detail="Recebimentos" iconSrc="/icones/financeiro.png" />
          <ShortcutLink to="/clients" title="Clientes" detail="Contato e mix" iconSrc="/icones/customer.png" />
          <ShortcutLink to="/products" title="Produtos" detail="Preço e cadastro" iconSrc="/icones/carregador.png" />
        </div>
      </section>
    </div>
  );
}

function QueueSignal({ label, value, tone }: { label: string; value: number; tone: "attention" | "active" | "done" }) {
  const toneClass = tone === "attention" ? "text-[var(--jam-warning)]" : tone === "done" ? "text-[var(--jam-success)]" : "text-[var(--jam-accent)]";

  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-subtle)]">{label}</p>
      <p className={cx("mt-1 font-display text-lg font-semibold", toneClass)}>{value}</p>
    </div>
  );
}

function ShortcutLink({
  to,
  title,
  detail,
  iconSrc,
}: {
  to: string;
  title: string;
  detail: string;
  iconSrc: string;
}) {
  return (
    <Link to={to}>
      <div className="flex h-full min-h-[72px] items-center gap-3 rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)] px-3 py-3 transition active:scale-[0.99] hover:border-[var(--jam-accent-border)] hover:bg-[var(--jam-panel-strong)]">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--jam-accent-soft)]">
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 object-contain"
          />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
            {title}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-accent)]">
            {detail}
          </p>
        </div>
      </div>
    </Link>
  );
}
