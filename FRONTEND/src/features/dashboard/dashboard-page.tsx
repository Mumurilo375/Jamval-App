import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, CompactLinkRow, EmptyState, PageHeader, PageLoader, SectionHeader } from "../../components/ui";
import {
  HistoryList,
  InProgressList,
  ReturnQueueList,
  StartVisitErrorBanner
} from "../visits/operational-queue";
import { useStartConsignmentVisit } from "../visits/use-start-consignment-visit";
import { listOperationalVisitQueue } from "../visits/visits-api";

export function DashboardPage() {
  const queueQuery = useQuery({
    queryKey: ["visits", "operational-queue"],
    queryFn: () => listOperationalVisitQueue()
  });
  const startVisit = useStartConsignmentVisit();

  if (queueQuery.isPending) {
    return <PageLoader label="Montando a fila do dia..." />;
  }

  if (queueQuery.isError || !queueQuery.data) {
    return (
      <EmptyState
        title="Nao foi possivel montar a fila do dia"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const queue = queueQuery.data;
  const mainAction = queue.mainAction;
  const hasOpenVisit = mainAction.mode === "continue" && mainAction.visitId;
  const mainActionTitle = hasOpenVisit ? "Continuar atendimento em aberto" : "Nova visita";
  const mainActionSubtitle = hasOpenVisit
    ? `${mainAction.clientName ?? "Cliente"} • ${mainAction.visitCode ?? ""}`
    : "Abra uma nova visita quando nao houver atendimento em aberto.";
  const mainActionHref = hasOpenVisit ? `/visits/${mainAction.visitId}` : "/visits/new";
  const mainActionLabel = hasOpenVisit ? "Continuar" : "Nova visita";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operacao"
        title="Fila do dia"
        subtitle="Veja quem volta primeiro, o que ja esta em andamento e o que ja rodou."
      />

      <Card className="space-y-3 border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.05)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-accent)]">Acao principal</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[var(--jam-ink)]">{mainActionTitle}</p>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">{mainActionSubtitle}</p>
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
          subtitle="Clientes de consignacao aguardando a proxima conferencia."
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
          emptyMessage="Quando uma base de consignacao estiver aguardando nova conferencia, ela aparece aqui."
          onStartVisit={startVisit.startVisit}
          pendingClientId={startVisit.pendingClientId}
        />
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Em andamento"
          subtitle="Atendimentos abertos para continuar sem duplicar trabalho."
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
          emptyMessage="Quando voce abrir uma visita e ainda nao concluir, ela aparece aqui."
        />
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Historico recente"
          subtitle="O que ja foi concluido e saiu da fila viva."
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Ver historico
              </Button>
            </Link>
          }
        />

        <HistoryList
          items={queue.recentHistory.slice(0, 5)}
          emptyTitle="Nenhuma visita concluida ainda"
          emptyMessage="As visitas concluidas vao aparecer aqui para consulta rapida."
        />
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Atalhos uteis"
          subtitle="Acessos secundarios sem competir com a fila principal."
        />

        <div className="space-y-2">
          <ShortcutLink to="/financeiro" title="Financeiro" />
          <ShortcutLink to="/clients" title="Clientes" />
          <ShortcutLink to="/products" title="Produtos" />
        </div>
      </div>
    </div>
  );
}

function ShortcutLink({ to, title }: { to: string; title: string }) {
  return (
    <Link to={to}>
      <CompactLinkRow
        title={title}
        right={<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-accent)]">Abrir</span>}
        className="transition hover:border-[rgba(29,78,216,0.18)]"
      />
    </Link>
  );
}
