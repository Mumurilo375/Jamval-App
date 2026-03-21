import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, EmptyState, PageHeader, PageLoader } from "../../components/ui";
import {
  HistoryList,
  InProgressList,
  QueueSegmentControl,
  ReturnQueueList,
  StartVisitErrorBanner,
  useStartConsignmentVisit
} from "./operational-queue";
import { listOperationalVisitQueue } from "./visits-api";

type VisitSegment = "return" | "in-progress" | "history";

export function VisitsListPage() {
  const [segment, setSegment] = useState<VisitSegment>("return");
  const queueQuery = useQuery({
    queryKey: ["visits", "operational-queue"],
    queryFn: () => listOperationalVisitQueue()
  });
  const startVisit = useStartConsignmentVisit();

  if (queueQuery.isPending) {
    return <PageLoader label="Carregando organizador operacional..." />;
  }

  if (queueQuery.isError || !queueQuery.data) {
    return (
      <EmptyState
        title="Falha ao carregar visitas"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const queue = queueQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Organizador de visitas"
        subtitle="Fila de retorno, atendimentos em andamento e historico recente no mesmo fluxo."
        action={
          <Link to="/visits/new">
            <Button>Nova visita</Button>
          </Link>
        }
      />

      <StartVisitErrorBanner error={startVisit.error} />

      <QueueSegmentControl
        value={segment}
        onChange={setSegment}
        counts={{
          return: queue.returnQueue.length,
          inProgress: queue.inProgress.length,
          history: queue.recentHistory.length
        }}
      />

      {segment === "return" ? (
        <ReturnQueueList
          items={queue.returnQueue}
          emptyTitle="Nenhum cliente na fila de retorno"
          emptyMessage="Quando uma consignacao ficar aguardando nova conferencia, ela aparece aqui."
          onStartVisit={startVisit.startVisit}
          pendingClientId={startVisit.pendingClientId}
        />
      ) : null}

      {segment === "in-progress" ? (
        <InProgressList
          items={queue.inProgress}
          emptyTitle="Nenhuma visita em andamento"
          emptyMessage="As visitas nao finalizadas ficam reunidas aqui para continuar depois."
        />
      ) : null}

      {segment === "history" ? (
        <HistoryList
          items={queue.recentHistory}
          emptyTitle="Nenhuma visita no historico"
          emptyMessage="As visitas concluidas vao aparecer aqui conforme forem sendo processadas."
        />
      ) : null}
    </div>
  );
}
