import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Button, EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { VisitForm } from "./visit-form";
import { getVisit } from "./visits-api";

export function VisitEditPage() {
  const { visitId = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: ({ signal }) => getVisit(visitId, signal),
    networkMode: "always",
    retry: false,
    retryOnMount: false
  });

  if (visitQuery.isPending) {
    return <PageLoader label="Carregando visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data) {
    const isNotFound = visitQuery.error instanceof ApiError && visitQuery.error.status === 404;

    return (
      <EmptyState
        title={isNotFound ? "Visita não encontrada" : "Não foi possível carregar a visita"}
        message={isNotFound ? "Volte para a lista e tente abrir a visita não finalizada novamente." : visitQuery.error?.message ?? "Tente novamente."}
        action={isNotFound ? undefined : <Button onClick={() => void visitQuery.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        backTo={`/visits/${visitId}`}
        backLabel="Visita"
        title="Editar dados da visita"
        subtitle={`${visitQuery.data.visitCode} · conferência e financeiro ficam no detalhe`}
      />
      <VisitForm mode="edit" visit={visitQuery.data} />
    </div>
  );
}
