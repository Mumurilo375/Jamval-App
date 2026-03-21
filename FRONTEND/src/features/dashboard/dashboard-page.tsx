import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, CompactLinkRow, EmptyState, PageHeader, PageLoader, SectionHeader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { listClients } from "../clients/clients-api";
import { listReceivables } from "../finance/finance-api";
import {
  buildReceivableRoute,
  matchesFinanceView,
  receivableStatusLabel,
  receivableStatusTone,
  sortReceivablesForQueue
} from "../finance/finance-utils";
import { listVisits } from "../visits/visits-api";
import { visitNumber, visitStatusLabel, visitStatusTone } from "../visits/visit-utils";

export function DashboardPage() {
  const draftVisitsQuery = useQuery({
    queryKey: ["operation-home", "drafts"],
    queryFn: () => listVisits({ status: "DRAFT" })
  });
  const clientsQuery = useQuery({
    queryKey: ["operation-home", "clients"],
    queryFn: () => listClients({})
  });
  const receivablesQuery = useQuery({
    queryKey: ["operation-home", "receivables"],
    queryFn: () => listReceivables({})
  });

  const draftVisits = draftVisitsQuery.data ?? [];
  const latestDraftVisit = draftVisits[0] ?? null;
  const visitsInProgress = draftVisits.slice(0, 4);
  const clientMap = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client.tradeName])),
    [clientsQuery.data]
  );
  const receivablesToCollect = useMemo(
    () =>
      sortReceivablesForQueue((receivablesQuery.data ?? []).filter((receivable) => matchesFinanceView(receivable, "OPEN"))).slice(0, 4),
    [receivablesQuery.data]
  );

  if (draftVisitsQuery.isPending || clientsQuery.isPending) {
    return <PageLoader label="Montando a fila do dia..." />;
  }

  if (draftVisitsQuery.isError || clientsQuery.isError) {
    return (
      <EmptyState
        title="Nao foi possivel montar a fila do dia"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const mainActionTitle = latestDraftVisit ? "Visita aberta pronta para continuar" : "Nenhuma visita aberta agora";
  const mainActionSubtitle = latestDraftVisit
    ? `${clientMap.get(latestDraftVisit.clientId) ?? "Cliente"} • ${formatDate(latestDraftVisit.visitedAt)} • ${latestDraftVisit.visitCode}`
    : "Abra uma nova visita para comecar a conferencia do dia.";
  const mainActionLabel = latestDraftVisit ? "Continuar visita aberta" : "Nova visita";
  const mainActionHref = latestDraftVisit ? `/visits/${latestDraftVisit.id}` : "/visits/new";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operacao"
        title="Fila do dia"
        subtitle="Retome o que ja esta aberto, veja o que precisa receber e siga para a proxima acao."
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

      <div className="space-y-3">
        <SectionHeader
          title="Visitas em andamento"
          subtitle="Rascunhos abertos para continuar hoje."
          action={
            <Link to="/visits">
              <Button variant="ghost" className="px-0">
                Abrir visitas
              </Button>
            </Link>
          }
        />

        {visitsInProgress.length === 0 ? (
          <Card className="space-y-3">
            <p className="text-sm text-[var(--jam-subtle)]">Nenhuma visita em andamento agora.</p>
            <Link to="/visits/new">
              <Button variant="secondary" className="w-full sm:w-auto">
                Nova visita
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--jam-border)] overflow-hidden p-0">
            {visitsInProgress.map((visit) => (
              <QueueRow
                key={visit.id}
                to={`/visits/${visit.id}`}
                title={clientMap.get(visit.clientId) ?? "Cliente"}
                subtitle={`${formatDate(visit.visitedAt)} • ${visit.visitCode}`}
                amount={formatCurrency(visitNumber(visit.totalAmount))}
                badge={<ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />}
              />
            ))}
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Para receber"
          subtitle="Titulos em aberto e parciais para tratar hoje."
          action={
            <Link to="/financeiro">
              <Button variant="ghost" className="px-0">
                Abrir receber
              </Button>
            </Link>
          }
        />

        {receivablesQuery.isPending ? (
          <Card>
            <p className="text-sm text-[var(--jam-subtle)]">Carregando cobrancas do dia...</p>
          </Card>
        ) : null}

        {receivablesQuery.isError ? (
          <Card className="space-y-3">
            <p className="text-sm text-[var(--jam-subtle)]">Nao foi possivel carregar os titulos para receber agora.</p>
            <Link to="/financeiro">
              <Button variant="secondary" className="w-full sm:w-auto">
                Abrir receber
              </Button>
            </Link>
          </Card>
        ) : null}

        {!receivablesQuery.isPending && !receivablesQuery.isError && receivablesToCollect.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--jam-subtle)]">Nenhum titulo aguardando recebimento agora.</p>
          </Card>
        ) : null}

        {!receivablesQuery.isPending && !receivablesQuery.isError && receivablesToCollect.length > 0 ? (
          <Card className="divide-y divide-[var(--jam-border)] overflow-hidden p-0">
            {receivablesToCollect.map((receivable) => (
              <QueueRow
                key={receivable.id}
                to={buildReceivableRoute(receivable.id, receivable.status)}
                title={receivable.client.tradeName}
                subtitle={`${receivable.visit.visitCode} • visita em ${formatDate(receivable.visit.visitedAt)}`}
                amount={formatCurrency(visitNumber(receivable.amountOutstanding))}
                badge={
                  <ToneBadge
                    label={receivableStatusLabel(receivable.status)}
                    tone={receivableStatusTone(receivable.status)}
                  />
                }
              />
            ))}
          </Card>
        ) : null}
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Atalhos uteis"
          subtitle="Base e configuracao sem competir com a operacao principal."
        />

        <div className="space-y-2">
          <ShortcutLink to="/clients" title="Clientes" />
          <ShortcutLink to="/products" title="Produtos" />
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  to,
  title,
  subtitle,
  amount,
  badge
}: {
  to: string;
  title: string;
  subtitle: string;
  amount: string;
  badge: ReactNode;
}) {
  return (
    <Link to={to} className="block px-4 py-3 transition hover:bg-[rgba(29,78,216,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{title}</p>
          <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{subtitle}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className="mb-1 flex justify-end">{badge}</div>
          <p className="text-sm font-semibold text-[var(--jam-ink)]">{amount}</p>
        </div>
      </div>
    </Link>
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
