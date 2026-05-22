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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operação"
        title="Fila do dia"
        subtitle={`${formatCount(returnCount, "retorno")} • ${formatCount(inProgressCount, "em andamento", "em andamento")} • ${formatCount(historyCount, "recente", "recentes")}`}
      />

      <Card className="space-y-3 border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.05)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-accent)]">
          Agora
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[var(--jam-ink)]">
              {mainActionTitle}
            </p>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">
              {mainActionSubtitle}
            </p>
          </div>

          <Link to={mainActionHref}>
            <Button className="w-full sm:w-auto">{mainActionLabel}</Button>
          </Link>
        </div>
      </Card>

      <StartVisitErrorBanner error={startVisit.error} />

      <div className="space-y-3">
        <SectionHeader
          title="Fila de retorno"
          subtitle={`${formatCount(returnCount, "cliente")} aguardando acerto`}
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Abrir organizador
              </Button>
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
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Em andamento"
          subtitle={`${formatCount(inProgressCount, "visita")} ${inProgressCount === 1 ? "aberta" : "abertas"} para continuar`}
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Ver tudo
              </Button>
            </Link>
          }
        />

        <InProgressList
          items={queue.inProgress.slice(0, 5)}
          emptyTitle="Nada em andamento agora"
          emptyMessage="Quando você abrir uma visita e ainda não concluir, ela aparece aqui."
        />
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Histórico recente"
          subtitle={`${formatCount(historyCount, "visita")} ${historyCount === 1 ? "concluída" : "concluídas"} para consulta`}
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Ver histórico
              </Button>
            </Link>
          }
        />

        <HistoryList
          items={queue.recentHistory.slice(0, 5)}
          emptyTitle="Nenhuma visita concluída ainda"
          emptyMessage="As visitas concluídas vão aparecer aqui para consulta rápida."
        />
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Atalhos"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ShortcutLink
            to="/financeiro"
            title="Financeiro"
            detail="Recebimentos"
            iconSrc="/icones/financeiro.png"
          />
          <ShortcutLink
            to="/clients"
            title="Clientes"
            detail="Contato e mix"
            iconSrc="/icones/customer.png"
          />
          <ShortcutLink
            to="/products"
            title="Produtos"
            detail="Preço e cadastro"
            iconSrc="/icones/carregador.png"
          />
        </div>
      </div>
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
      <div className="flex h-full min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)] px-4 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition active:scale-[0.99] hover:border-[rgba(29,78,216,0.18)] hover:bg-[var(--jam-panel-strong)]">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--jam-accent-soft)]">
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 object-contain"
          />
        </div>
        <div className="min-w-0">
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
