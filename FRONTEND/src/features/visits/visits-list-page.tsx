import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, EmptyState, PageHeader, PageLoader, PaginationControls } from "../../components/ui";
import { paginateItems } from "../../lib/pagination";
import {
  HistoryList,
  InProgressList,
  QueueSegmentControl,
  ReturnQueueList,
  StartVisitErrorBanner
} from "./operational-queue";
import { useStartConsignmentVisit } from "./use-start-consignment-visit";
import { listOperationalVisitQueue } from "./visits-api";

type VisitSegment = "return" | "in-progress" | "history";
const VISITS_PAGE_SIZE = 6;

export function VisitsListPage() {
  const [segment, setSegment] = useState<VisitSegment>("return");
  const [pages, setPages] = useState<Record<VisitSegment, number>>({
    return: 1,
    "in-progress": 1,
    history: 1
  });
  const queueQuery = useQuery({
    queryKey: ["visits", "operational-queue"],
    queryFn: () => listOperationalVisitQueue()
  });
  const startVisit = useStartConsignmentVisit();
  const queueData = queueQuery.data;
  const returnPagination = paginateItems(queueData?.returnQueue ?? [], pages.return, VISITS_PAGE_SIZE);
  const inProgressPagination = paginateItems(
    queueData?.inProgress ?? [],
    pages["in-progress"],
    VISITS_PAGE_SIZE
  );
  const historyPagination = paginateItems(queueData?.recentHistory ?? [], pages.history, VISITS_PAGE_SIZE);

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

  const queue = queueData!;

  const updatePage = (target: VisitSegment, nextPage: number) => {
    setPages((current) => ({
      ...current,
      [target]: nextPage
    }));
  };

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
        <>
          <ReturnQueueList
            items={returnPagination.pageItems}
            emptyTitle="Nenhum cliente na fila de retorno"
            emptyMessage="Quando uma consignacao ficar aguardando nova conferencia, ela aparece aqui."
            onStartVisit={startVisit.startVisit}
            pendingClientId={startVisit.pendingClientId}
          />
          <PaginationControls
            page={returnPagination.page}
            totalPages={returnPagination.totalPages}
            totalItems={queue.returnQueue.length}
            pageSize={VISITS_PAGE_SIZE}
            itemLabel="clientes"
            onPageChange={(nextPage) => updatePage("return", nextPage)}
          />
        </>
      ) : null}

      {segment === "in-progress" ? (
        <>
          <InProgressList
            items={inProgressPagination.pageItems}
            emptyTitle="Nenhuma visita em andamento"
            emptyMessage="As visitas nao finalizadas ficam reunidas aqui para continuar depois."
          />
          <PaginationControls
            page={inProgressPagination.page}
            totalPages={inProgressPagination.totalPages}
            totalItems={queue.inProgress.length}
            pageSize={VISITS_PAGE_SIZE}
            itemLabel="visitas"
            onPageChange={(nextPage) => updatePage("in-progress", nextPage)}
          />
        </>
      ) : null}

      {segment === "history" ? (
        <>
          <HistoryList
            items={historyPagination.pageItems}
            emptyTitle="Nenhuma visita no historico"
            emptyMessage="As visitas concluidas vao aparecer aqui conforme forem sendo processadas."
          />
          <PaginationControls
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            totalItems={queue.recentHistory.length}
            pageSize={VISITS_PAGE_SIZE}
            itemLabel="visitas"
            onPageChange={(nextPage) => updatePage("history", nextPage)}
          />
        </>
      ) : null}
    </div>
  );
}
