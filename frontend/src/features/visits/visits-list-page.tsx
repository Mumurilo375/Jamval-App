import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, Select, ToneBadge } from "../../components/ui";
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
        title="Visitas"
        subtitle="Operacao draft mobile-first: abra, ajuste e revise cada visita antes do fechamento."
        action={
          <Link to="/visits/new">
            <Button>Nova</Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <p className="text-sm font-medium text-[var(--jam-ink)]">Status</p>
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="DRAFT">DRAFT</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </Select>
      </Card>

      {visitsQuery.isPending || clientsQuery.isPending ? <PageLoader label="Carregando visitas..." /> : null}

      {visitsQuery.isError || clientsQuery.isError ? (
        <EmptyState title="Falha ao carregar visitas" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!visitsQuery.isPending && !visitsQuery.isError && visitsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhuma visita nessa faixa"
          message="Abra uma nova visita draft para comecar a conferencia do cliente."
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
                <div>
                  <p className="font-display text-lg font-bold">{clientMap.get(visit.clientId) ?? "Cliente"}</p>
                  <p className="text-sm text-[var(--jam-subtle)]">{visit.visitCode}</p>
                </div>
                <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Data</p>
                  <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">{formatDate(visit.visitedAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Total</p>
                  <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">{formatCurrency(visit.totalAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Recebido</p>
                  <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">
                    {formatCurrency(visit.receivedAmountOnVisit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]">Vencimento</p>
                  <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">{formatDate(visit.dueDate)}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
