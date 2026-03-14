import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, SectionHeader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { listClients } from "../clients/clients-api";
import { listReceivables } from "../finance/finance-api";
import { groupClientsByOutstanding, summarizeReceivables } from "../finance/finance-utils";
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
  const receivablesQuery = useQuery({
    queryKey: ["operation-home", "receivables"],
    queryFn: () => listReceivables({})
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
  const financialSummary = useMemo(
    () => summarizeReceivables(receivablesQuery.data ?? []),
    [receivablesQuery.data]
  );
  const topClientsByOutstanding = useMemo(
    () => groupClientsByOutstanding(receivablesQuery.data ?? [], 3),
    [receivablesQuery.data]
  );

  if (draftVisitsQuery.isPending || recentVisitsQuery.isPending || clientsQuery.isPending) {
    return <PageLoader label="Montando operacao..." />;
  }

  if (draftVisitsQuery.isError || recentVisitsQuery.isError || clientsQuery.isError) {
    return <EmptyState title="Nao foi possivel carregar a operacao" message="Confira a conexao com o backend e tente novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Inicio da operacao"
        subtitle="Nova visita, fila de rascunhos e leitura rapida da carteira para manter o dia em movimento."
      />

      <Card className="space-y-4 border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.04)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-accent)]">Nova visita</p>
            <p className="mt-1 font-display text-[1.4rem] font-semibold text-[var(--jam-ink)] sm:text-2xl">
              Comece a proxima conferencia sem perder tempo
            </p>
            <p className="mt-2 text-[13px] text-[var(--jam-subtle)] sm:text-sm">
              Use este atalho quando for abrir uma visita nova no cliente e iniciar a conferencia do consignado.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <QuickInfoCard label="Rascunhos ativos" value={String(draftVisits.length)} />
            <QuickInfoCard label="Titulos em aberto" value={String(financialSummary.openCount)} />
            <QuickInfoCard label="Valor pendente" value={formatCurrency(financialSummary.totalPendingAmount)} />
          </div>
        </div>

        <Link to="/visits/new">
          <Button className="w-full justify-between text-sm">
              <span>Nova visita</span>
              <span>→</span>
          </Button>
        </Link>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
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
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{clientMap.get(visit.clientId) ?? "Cliente"}</p>
                        <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{formatDate(visit.visitedAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
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
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Atencao rapida"
          subtitle="Carteira em aberto e clientes que pedem acompanhamento mais proximo."
        />
        <Card className="space-y-4">
          {receivablesQuery.isError ? (
            <p className="text-sm text-[var(--jam-subtle)]">
              Nao foi possivel carregar a leitura financeira rapida agora.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <QuickInfoCard label="Titulos em aberto" value={String(financialSummary.openCount)} />
                <QuickInfoCard label="Valor pendente total" value={formatCurrency(financialSummary.totalPendingAmount)} />
                <QuickInfoCard label="Clientes com maior pendencia" value={String(topClientsByOutstanding.length)} />
              </div>

              <div className="space-y-2">
                {topClientsByOutstanding.length === 0 ? (
                  <p className="text-sm text-[var(--jam-subtle)]">Nenhum cliente com pendencia registrado agora.</p>
                ) : (
                  topClientsByOutstanding.map((client) => (
                    <div key={client.clientId} className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{client.tradeName}</p>
                          <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">
                            {client.receivableCount} titulo(s) em aberto
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--jam-ink)]">
                          {formatCurrency(client.outstandingAmount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Link to="/financeiro">
                <Button variant="secondary" className="w-full justify-between">
                  <span>Abrir financeiro</span>
                  <span>→</span>
                </Button>
              </Link>
            </>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Atalhos uteis" subtitle="Acesso rapido para base, catalogo e documentos da operacao." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/clients">
            <Card className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Clientes</p>
              <p className="text-sm text-[var(--jam-subtle)]">Base comercial e acesso ao catalogo por loja.</p>
            </Card>
          </Link>
          <Link to="/products">
            <Card className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Produtos</p>
              <p className="text-sm text-[var(--jam-subtle)]">SKUs e base comercial do consignado.</p>
            </Card>
          </Link>
          <Link to="/catalog">
            <Card className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Catalogo</p>
              <p className="text-sm text-[var(--jam-subtle)]">Mix configurado de cada cliente.</p>
            </Card>
          </Link>
          <Link to="/receipts">
            <Card className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--jam-ink)]">Comprovantes</p>
              <p className="text-sm text-[var(--jam-subtle)]">Visitas concluidas e comprovantes gerados.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
