import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button, Card, EmptyState, ErrorBanner, PageHeader, PageLoader, SectionHeader, ToneBadge, WarningBanner } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { listClientCatalog } from "../client-catalog/catalog-api";
import { getClient } from "../clients/clients-api";
import { VisitCompletionPanel } from "./visit-completion-panel";
import { VisitFinancialPanel } from "./visit-financial-panel";
import { VisitReceiptCard } from "./visit-receipt-card";
import {
  bulkUpsertVisitItems,
  cancelVisit,
  deleteVisitItem,
  getVisit,
  listCentralBalances,
  listCompletedVisitHistoryDetails
} from "./visits-api";
import {
  buildAutoPopulatedVisitItems,
  buildSuggestedPreviousByProductId,
  visitNumber,
  visitStatusLabel,
  visitStatusTone
} from "./visit-utils";

export function VisitDetailPage() {
  const { visitId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const autoPopulateAttemptedRef = useRef<string | null>(null);
  const [autoPopulateCount, setAutoPopulateCount] = useState(0);
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });
  const clientQuery = useQuery({
    queryKey: ["client", visitQuery.data?.clientId],
    queryFn: () => getClient(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVisit(visitId),
    onSuccess: async (visit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", visit.id], visit);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => deleteVisitItem(visitId, itemId),
    onSuccess: async (visit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", visit.id], visit);
    }
  });
  const autoPopulateMutation = useMutation({
    mutationFn: (items: Parameters<typeof bulkUpsertVisitItems>[1]) => bulkUpsertVisitItems(visitId, items),
    onSuccess: async (visit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", visit.id], visit);
      setAutoPopulateCount(visit.items.length);
    }
  });

  const clientName = useMemo(() => clientQuery.data?.tradeName ?? "Cliente", [clientQuery.data]);
  const visit = visitQuery.data;
  const isDraft = visit?.status === "DRAFT";
  const shouldAutopopulate = Boolean(visit?.clientId && isDraft && (visit?.items.length ?? 0) === 0);
  const clientCatalogQuery = useQuery({
    queryKey: ["client-catalog", visit?.clientId, "visit-autopopulate"],
    queryFn: () => listClientCatalog(visit!.clientId, true),
    enabled: shouldAutopopulate
  });
  const completedHistoryQuery = useQuery({
    queryKey: ["visits", visit?.clientId, "completed-history-details", "visit-autopopulate"],
    queryFn: () => listCompletedVisitHistoryDetails(visit!.clientId),
    enabled: shouldAutopopulate
  });
  const productIds = useMemo(
    () => Array.from(new Set((visit?.items ?? []).map((item) => item.productId))),
    [visit?.items]
  );
  const centralBalancesQuery = useQuery({
    queryKey: ["stock", "central-balances", productIds],
    queryFn: () => listCentralBalances(productIds),
    enabled: Boolean(isDraft && productIds.length > 0)
  });
  const availableCentralByProductId = useMemo(
    () =>
      Object.fromEntries((centralBalancesQuery.data ?? []).map((entry) => [entry.productId, entry.currentQuantity])),
    [centralBalancesQuery.data]
  );
  const stockWarnings = useMemo(
    () => {
      if (!isDraft || !centralBalancesQuery.data) {
        return [];
      }

      return (visit?.items ?? [])
        .map((item) => {
          const availableQuantity = availableCentralByProductId[item.productId] ?? 0;
          if (item.restockedQuantity <= availableQuantity) {
            return null;
          }

          return {
            productId: item.productId,
            productName: item.productSnapshotName,
            requiredQuantity: item.restockedQuantity,
            availableQuantity
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    },
    [availableCentralByProductId, centralBalancesQuery.data, isDraft, visit?.items]
  );
  const stockWarningByProductId = useMemo(
    () => Object.fromEntries(stockWarnings.map((entry) => [entry.productId, entry])),
    [stockWarnings]
  );

  useEffect(() => {
    if (!visit || !shouldAutopopulate) {
      return;
    }

    if (!clientCatalogQuery.isSuccess || !completedHistoryQuery.isSuccess) {
      return;
    }

    if (autoPopulateAttemptedRef.current === visit.id) {
      return;
    }

    autoPopulateAttemptedRef.current = visit.id;

    const suggestedPreviousByProductId = buildSuggestedPreviousByProductId(completedHistoryQuery.data);
    const itemsToPopulate = buildAutoPopulatedVisitItems({
      catalogItems: clientCatalogQuery.data,
      suggestedPreviousByProductId
    });

    if (itemsToPopulate.length === 0) {
      return;
    }

    void autoPopulateMutation.mutateAsync(itemsToPopulate);
  }, [
    autoPopulateMutation,
    clientCatalogQuery.data,
    clientCatalogQuery.isSuccess,
    completedHistoryQuery.data,
    completedHistoryQuery.isSuccess,
    shouldAutopopulate,
    visit
  ]);

  if (visitQuery.isPending || clientQuery.isPending) {
    return <PageLoader label="Carregando visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data || clientQuery.isError) {
    return <EmptyState title="Visita nao encontrada" message="Volte para a lista de visitas e tente novamente." />;
  }

  const resolvedVisit = visitQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Visita"
        title={clientName}
        subtitle={resolvedVisit.visitCode}
        action={<ToneBadge label={visitStatusLabel(resolvedVisit.status)} tone={visitStatusTone(resolvedVisit.status)} />}
      />

      <Card className="space-y-4">
        <VisitHeaderMetric label="Data da visita" value={formatDate(resolvedVisit.visitedAt)} />

        <div className="rounded-2xl bg-white/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Observacoes</p>
          <p className="mt-1 text-sm text-[var(--jam-subtle)]">{resolvedVisit.notes || "Sem observacoes registradas."}</p>
        </div>

        {isDraft ? (
          <Link to={`/visits/${resolvedVisit.id}/edit`}>
            <Button variant="secondary" className="w-full">
              Editar dados da visita
            </Button>
          </Link>
        ) : null}
      </Card>

      <div className="space-y-3">
        <SectionHeader
          title="Conferencia dos produtos"
          subtitle="Comece pelo que havia no cliente, conte o que sobrou e deixe o sistema calcular a cobranca."
          action={
            isDraft ? (
              <Link to={`/visits/${resolvedVisit.id}/items/new`}>
                <Button>Novo item</Button>
              </Link>
            ) : undefined
          }
        />

        {autoPopulateCount > 0 ? (
          <div className="rounded-2xl border border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.05)] px-3.5 py-3 text-sm text-[var(--jam-ink)]">
            Os produtos que ja estavam na loja foram carregados para conferencia.
          </div>
        ) : null}

        {resolvedVisit.items.length === 0 ? (
          shouldAutopopulate && (clientCatalogQuery.isPending || completedHistoryQuery.isPending || autoPopulateMutation.isPending) ? (
            <Card className="space-y-2">
              <p className="text-sm font-medium text-[var(--jam-ink)]">Carregando produtos que ja estavam na loja...</p>
              <p className="text-sm text-[var(--jam-subtle)]">
                Estamos preparando a conferencia automaticamente a partir do historico do cliente.
              </p>
            </Card>
          ) : (
            <EmptyState
              title="Nenhum item ainda"
              message="Adicione os produtos conferidos no cliente para calcular o total da cobranca."
              action={
                isDraft ? (
                  <Link to={`/visits/${resolvedVisit.id}/items/new`}>
                    <Button>Adicionar primeiro item</Button>
                  </Link>
                ) : undefined
              }
            />
          )
        ) : null}

        {shouldAutopopulate && (clientCatalogQuery.isError || completedHistoryQuery.isError) ? (
          <ErrorBanner message="Nao foi possivel carregar automaticamente os produtos ja presentes na loja. Voce pode adicionar manualmente." />
        ) : null}

        {autoPopulateMutation.error instanceof Error ? (
          <ErrorBanner message="Nao foi possivel carregar automaticamente os produtos ja presentes na loja. Voce pode adicionar manualmente." />
        ) : null}

        <div className="space-y-3">
          {resolvedVisit.items.map((item) => (
            <Card key={item.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{item.productSnapshotName}</p>
                  <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{item.productSnapshotSku}</p>
                </div>
                <ToneBadge label="Conferencia" tone="neutral" />
              </div>

              <div className="rounded-2xl border border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.04)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-accent)]">Anterior no cliente</p>
                <p className="mt-2 font-display text-4xl font-semibold text-[var(--jam-ink)]">{item.quantityPrevious}</p>
                <p className="mt-1 text-sm text-[var(--jam-subtle)]">Essa quantidade e a base da conferencia atual.</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Conferencia atual</p>
                <div className="grid grid-cols-2 gap-3">
                  <ItemMetric label="Restante na loja" value={item.quantityGoodRemaining} />
                  <ItemMetric label="Trocas" value={item.quantityDefectiveReturn} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Calculo automatico</p>
                <div className="grid grid-cols-3 gap-3">
                  <ItemMetric label="Vendido" value={item.quantitySold} highlight />
                  <ItemMetric label="Preco unitario" value={formatCurrency(visitNumber(item.unitPrice))} />
                  <ItemMetric label="Subtotal da cobranca" value={formatCurrency(visitNumber(item.subtotalAmount))} highlight />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Reposicao e proximo saldo</p>
                <div className="grid grid-cols-2 gap-3">
                  <ItemMetric label="Quantidade reposta" value={item.restockedQuantity} />
                  <ItemMetric label="Novo saldo no cliente" value={item.resultingClientQuantity} highlightSoft />
                </div>
              </div>

              {stockWarningByProductId[item.productId] ? (
                <WarningBanner
                  message={`Reposicao acima do estoque central disponivel. Disponivel agora: ${stockWarningByProductId[item.productId].availableQuantity}. Reposto informado: ${stockWarningByProductId[item.productId].requiredQuantity}.`}
                />
              ) : null}

              {item.notes ? <p className="text-sm text-[var(--jam-subtle)]">{item.notes}</p> : null}

              {isDraft ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link to={`/visits/${resolvedVisit.id}/items/${item.id}/edit`}>
                    <Button variant="secondary" className="w-full">
                      Editar conferencia
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="w-full"
                    disabled={deleteItemMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Remover este item da visita em rascunho?")) {
                        void deleteItemMutation.mutateAsync({ itemId: item.id });
                      }
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>

      {stockWarnings.length > 0 ? (
        <WarningBanner
          message={`Estoque central insuficiente em ${stockWarnings.length} produto(s): ${stockWarnings
            .map((entry) => `${entry.productName} (reposto ${entry.requiredQuantity}, disponivel ${entry.availableQuantity})`)
            .join(" | ")}. O backend ainda vai validar isso na conclusao.`}
        />
      ) : null}

      <div className="space-y-3">
        <SectionHeader
          title="Totais da visita"
          subtitle="O total a cobrar e calculado automaticamente pela soma dos subtotais dos produtos."
        />

        <Card className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Total a cobrar</p>
              <p className="mt-1 font-display text-4xl font-semibold text-[var(--jam-ink)]">
                {formatCurrency(visitNumber(resolvedVisit.totalAmount))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Itens conferidos</p>
              <p className="mt-1 text-xl font-semibold text-[var(--jam-ink)]">{resolvedVisit.items.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <VisitFinancialPanel visit={resolvedVisit} />
      <VisitReceiptCard visit={resolvedVisit} />

      <VisitCompletionPanel visit={resolvedVisit} />

      {isDraft ? (
        <Card className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Acoes do rascunho</p>
          <Button
            variant="danger"
            className="w-full"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (window.confirm("Cancelar esta visita em rascunho?")) {
                void cancelMutation.mutateAsync().then(() => navigate("/visits", { replace: true }));
              }
            }}
          >
            Cancelar visita
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

function VisitHeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function ItemMetric({
  label,
  value,
  highlight = false,
  highlightSoft = false
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  highlightSoft?: boolean;
}) {
  const className = highlight
    ? "rounded-xl bg-[rgba(245,158,11,0.14)] p-3"
    : highlightSoft
      ? "rounded-xl bg-[rgba(15,118,110,0.08)] p-3"
      : "rounded-xl bg-[var(--jam-panel-strong)] p-3";

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
