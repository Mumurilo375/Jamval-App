import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, SectionHeader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { listClients } from "../clients/clients-api";
import { getVisit, listVisits } from "../visits/visits-api";
import { visitStatusLabel, visitStatusTone } from "../visits/visit-utils";

export function DashboardPage() {
  const draftVisitsQuery = useQuery({
    queryKey: ["operation-home", "drafts"],
    queryFn: () => listVisits({ status: "DRAFT" })
  });
  const recentVisitsQuery = useQuery({
    queryKey: ["operation-home", "recent-visits"],
    queryFn: () => listVisits({})
  });
  const clientsQuery = useQuery({
    queryKey: ["operation-home", "clients"],
    queryFn: () => listClients({})
  });
  const draftVisits = (draftVisitsQuery.data ?? []).slice(0, 4);
  const recentVisits = (recentVisitsQuery.data ?? []).slice(0, 5);
  const draftVisitIds = useMemo(() => draftVisits.map((visit) => visit.id), [draftVisits]);
  const draftDetailsQuery = useQuery({
    queryKey: ["operation-home", "draft-details", draftVisitIds],
    queryFn: () => Promise.all(draftVisits.map((visit) => getVisit(visit.id))),
    enabled: draftVisitIds.length > 0
  });
  const clientMap = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client.tradeName])),
    [clientsQuery.data]
  );
  const draftDetailMap = useMemo(
    () => new Map((draftDetailsQuery.data ?? []).map((visit) => [visit.id, visit])),
    [draftDetailsQuery.data]
  );

  if (draftVisitsQuery.isPending || recentVisitsQuery.isPending) {
    return <PageLoader label="Montando operacao..." />;
  }

  if (draftVisitsQuery.isError || recentVisitsQuery.isError) {
    return <EmptyState title="Nao foi possivel carregar a operacao" message="Confira a conexao com o backend e tente novamente." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operacao"
        title="Nova visita e retomada rapida"
        subtitle="A home prioriza o que esta em aberto para voce agir sem pensar duas vezes."
      />

      <Card className="space-y-4 border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.04)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-accent)]">Proxima acao principal</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[var(--jam-ink)]">Abrir uma nova visita</p>
          <p className="mt-2 text-sm text-[var(--jam-subtle)]">
            Comece por aqui quando for iniciar uma nova conferência no cliente.
          </p>
        </div>
        <Link to="/visits/new">
          <Button className="min-h-12 w-full justify-between text-base">
            <span>Nova visita</span>
            <span>→</span>
          </Button>
        </Link>
      </Card>

      <div className="space-y-3">
        <SectionHeader
          title="Rascunhos"
          subtitle="Visitas abertas aguardando conferencia, ajuste ou conclusao."
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Ver todas
              </Button>
            </Link>
          }
        />

        {draftVisits.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--jam-subtle)]">Nenhum rascunho aberto agora.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {draftVisits.map((visit) => (
              <Link key={visit.id} to={`/visits/${visit.id}`}>
                <Card className="space-y-3 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{clientMap.get(visit.clientId) ?? "Cliente"}</p>
                      <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{formatDate(visit.visitedAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <ToneBadge label="DRAFT" tone="warning" />
                      <p className="text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(visit.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm text-[var(--jam-subtle)]">
                    <p className="truncate">{visit.visitCode}</p>
                    {draftDetailMap.get(visit.id) ? <p className="shrink-0">{draftDetailMap.get(visit.id)!.items.length} item(ns)</p> : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionHeader title="Ultimas visitas" subtitle="Leitura rapida para retomar o historico recente." />
        {recentVisits.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--jam-subtle)]">Nenhuma visita registrada ainda.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--jam-border)] p-0">
            {recentVisits.map((visit) => (
              <Link key={visit.id} to={`/visits/${visit.id}`} className="block px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--jam-ink)]">{clientMap.get(visit.clientId) ?? "Cliente"}</p>
                    <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{formatDate(visit.visitedAt)}</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-1 flex justify-end">
                      <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(visit.totalAmount)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--jam-ink)]">Pendencias</p>
            <p className="text-sm text-[var(--jam-subtle)]">Financeiro e cobrancas vao aparecer aqui.</p>
          </div>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <Link to="/pendencias">
          <Button variant="secondary" className="w-full justify-between">
            <span>Abrir area de pendencias</span>
            <span>→</span>
          </Button>
        </Link>
      </Card>

      <div className="space-y-3">
        <SectionHeader title="Atalhos de cadastro" subtitle="Acesso rapido para manter base e catalogo organizados." />
        <div className="grid grid-cols-2 gap-3">
          <Link to="/clients">
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Clientes</p>
              <p className="text-sm text-[var(--jam-subtle)]">Cadastro comercial e acesso ao catalogo de cada cliente.</p>
            </Card>
          </Link>
          <Link to="/products">
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Produtos</p>
              <p className="text-sm text-[var(--jam-subtle)]">SKUs e base do consignado para novas visitas.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
