import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { listClients } from "../clients/clients-api";
import { listVisits } from "./visits-api";
import { visitStatusLabel, visitStatusTone } from "./visit-utils";

export function VisitsListPage() {
  const [status, setStatus] = useState<"DRAFT" | "COMPLETED" | "CANCELLED">("DRAFT");
  const filters = useMemo(() => ({ status }), [status]);

  const visitsQuery = useQuery({
    queryKey: ["visits", filters],
    queryFn: () => listVisits(filters)
  });
  const clientsQuery = useQuery({
    queryKey: ["clients", "visits-map"],
    queryFn: () => listClients({})
  });

  const clientMap = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client.tradeName])),
    [clientsQuery.data]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Visitas"
        subtitle="Abra rascunhos, acompanhe historico e retome a operacao sem perder tempo."
        action={
          <Link to="/visits/new">
            <Button>Nova</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        {(["DRAFT", "COMPLETED", "CANCELLED"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={
              status === option
                ? "rounded-xl bg-[var(--jam-accent)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                : "rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]"
            }
          >
            {visitStatusLabel(option)}
          </button>
        ))}
      </div>

      {visitsQuery.isPending ? <PageLoader label="Carregando visitas..." /> : null}

      {visitsQuery.isError ? (
        <EmptyState title="Falha ao carregar visitas" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!visitsQuery.isPending && !visitsQuery.isError && visitsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhuma visita nessa faixa"
          message="Abra uma nova visita em rascunho para comecar a conferencia do cliente."
          action={
            <Link to="/visits/new">
              <Button>Criar visita</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {visitsQuery.data?.map((visit) => (
          <Link key={visit.id} to={`/visits/${visit.id}`}>
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{clientMap.get(visit.clientId) ?? "Cliente"}</p>
                  <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{visit.visitCode}</p>
                </div>
                <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <VisitMetric label="Data" value={formatDate(visit.visitedAt)} />
                <VisitMetric label="Total" value={formatCurrency(visit.totalAmount)} />
                <VisitMetric label="Recebido" value={formatCurrency(visit.receivedAmountOnVisit)} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function VisitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
