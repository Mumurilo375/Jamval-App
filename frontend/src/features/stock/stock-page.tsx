import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageLoader,
  SectionHeader,
  Select,
  ToneBadge,
  WarningBanner
} from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import {
  getCentralOverview,
  listCentralMovements,
  listCentralVisitOutflows,
  type CentralMovementKind
} from "./stock-api";

const tabs = [
  { value: "saldo", label: "Saldo atual" },
  { value: "historico", label: "Historico" },
  { value: "saidas", label: "Saidas para clientes" }
] as const;

const movementKindOptions: Array<{ value: "" | CentralMovementKind; label: string }> = [
  { value: "", label: "Todos os movimentos" },
  { value: "INITIAL_LOAD", label: "Carga inicial" },
  { value: "MANUAL_ENTRY", label: "Entrada manual" },
  { value: "MANUAL_ADJUSTMENT", label: "Ajustes" },
  { value: "RESTOCK_TO_CLIENT", label: "Saidas para clientes" },
  { value: "DEFECTIVE_RETURN_LOG", label: "Retornos com defeito" }
];

export function StockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "historico" || searchParams.get("tab") === "saidas" ? searchParams.get("tab")! : "saldo";
  const balanceSearch = searchParams.get("balanceSearch") ?? "";
  const historySearch = searchParams.get("historySearch") ?? "";
  const historyMovementKind = (searchParams.get("movementKind") as CentralMovementKind | null) ?? "";
  const historyDateFrom = searchParams.get("historyDateFrom") ?? "";
  const historyDateTo = searchParams.get("historyDateTo") ?? "";
  const outflowDateFrom = searchParams.get("outflowDateFrom") ?? "";
  const outflowDateTo = searchParams.get("outflowDateTo") ?? "";

  const overviewQuery = useQuery({
    queryKey: ["stock", "overview"],
    queryFn: getCentralOverview
  });
  const movementsQuery = useQuery({
    queryKey: ["stock", "movements", historySearch, historyMovementKind, historyDateFrom, historyDateTo],
    queryFn: () =>
      listCentralMovements({
        search: historySearch.trim() || undefined,
        movementKind: historyMovementKind || undefined,
        dateFrom: historyDateFrom || undefined,
        dateTo: historyDateTo || undefined
      }),
    enabled: activeTab === "historico"
  });
  const outflowsQuery = useQuery({
    queryKey: ["stock", "outflows", outflowDateFrom, outflowDateTo],
    queryFn: () =>
      listCentralVisitOutflows({
        dateFrom: outflowDateFrom || undefined,
        dateTo: outflowDateTo || undefined
      }),
    enabled: activeTab === "saidas"
  });

  const filteredBalanceItems = useMemo(() => {
    const search = balanceSearch.trim().toLocaleLowerCase();

    return [...(overviewQuery.data?.items ?? [])]
      .filter((item) => {
        if (!search) {
          return true;
        }

        return `${item.name} ${item.sku}`.toLocaleLowerCase().includes(search);
      })
      .sort((left, right) => {
        const leftHasStock = left.currentQuantity > 0 ? 1 : 0;
        const rightHasStock = right.currentQuantity > 0 ? 1 : 0;

        if (leftHasStock !== rightHasStock) {
          return rightHasStock - leftHasStock;
        }

        return left.name.localeCompare(right.name);
      });
  }, [balanceSearch, overviewQuery.data?.items]);

  if (overviewQuery.isPending) {
    return <PageLoader label="Carregando estoque..." />;
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <EmptyState
        title="Nao foi possivel carregar o estoque"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const { summary, items } = overviewQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Estoque central"
        title="Controle operacional do estoque"
        subtitle="Saldo atual, movimentos e o que saiu para os clientes nas visitas."
      />

      <Card className="space-y-4">
        <SectionHeader
          title="Resumo operacional"
          subtitle="Leitura rapida do estoque central neste momento."
        />
        <div className="grid grid-cols-3 gap-3">
          <SummaryMetric label="Produtos com saldo" value={String(summary.productsWithStock)} />
          <SummaryMetric label="Unidades no central" value={String(summary.totalUnits)} />
          <SummaryMetric
            label="Ultima movimentacao"
            value={summary.lastMovementAt ? formatDateTime(summary.lastMovementAt) : "-"}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeader
          title="Acoes do estoque"
          subtitle="Use entrada manual para novas mercadorias e ajuste manual apenas para correcao."
        />

        {summary.canUseInitialLoad ? (
          <WarningBanner message="Carga inicial e um fluxo de comeco de operacao. Depois da primeira montagem do estoque, o fluxo correto para novas mercadorias passa a ser Entrada manual." />
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">
            Carga inicial ficou restrita ao comeco da operacao. Para novas mercadorias, siga com Entrada manual.
          </p>
        )}

        <div className="grid gap-3">
          {summary.canUseInitialLoad ? (
            <Link to="/stock/initial-load">
              <Button className="w-full justify-between">
                <span>Carga inicial</span>
                <span>→</span>
              </Button>
            </Link>
          ) : null}

          <Link to="/stock/manual-entry">
            <Button variant="secondary" className="w-full justify-between">
              <span>Entrada manual</span>
              <span>→</span>
            </Button>
          </Link>

          <Link to="/stock/manual-adjustment">
            <Button variant="secondary" className="w-full justify-between">
              <span>Ajuste manual</span>
              <span>→</span>
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateStockSearchParams(searchParams, setSearchParams, { tab: tab.value })}
            className={
              activeTab === tab.value
                ? "rounded-xl bg-[var(--jam-accent)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                : "rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "saldo" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <Field label="Busca por produto">
              <Input
                placeholder="Buscar por nome ou SKU"
                value={balanceSearch}
                onChange={(event) =>
                  updateStockSearchParams(searchParams, setSearchParams, {
                    balanceSearch: event.target.value
                  })
                }
              />
            </Field>
          </Card>

          {items.length === 0 ? (
            <EmptyState
              title="Nenhum produto cadastrado"
              message="Cadastre produtos para comecar a controlar o estoque central."
              action={
                <Link to="/products">
                  <Button>Ir para produtos</Button>
                </Link>
              }
            />
          ) : filteredBalanceItems.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--jam-subtle)]">Nenhum produto encontrado para essa busca.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBalanceItems.map((item) => (
                <Card key={item.productId} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{item.name}</p>
                      <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{item.sku}</p>
                    </div>
                    {!item.isActive ? <ToneBadge label="Inativo" tone="neutral" /> : null}
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Saldo atual</p>
                      <p className="mt-1 font-display text-4xl font-semibold text-[var(--jam-ink)]">{item.currentQuantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Ultima movimentacao</p>
                      <p className="mt-1 text-sm font-medium text-[var(--jam-ink)]">
                        {item.lastMovementAt ? formatDateTime(item.lastMovementAt) : "Sem historico"}
                      </p>
                    </div>
                  </div>

                  {item.category ? <p className="text-sm text-[var(--jam-subtle)]">Categoria: {item.category}</p> : null}
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "historico" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <Field label="Busca">
              <Input
                placeholder="Produto, SKU, referencia ou observacao"
                value={historySearch}
                onChange={(event) =>
                  updateStockSearchParams(searchParams, setSearchParams, {
                    historySearch: event.target.value
                  })
                }
              />
            </Field>

            <Field label="Tipo de movimento">
              <Select
                value={historyMovementKind}
                onChange={(event) =>
                  updateStockSearchParams(searchParams, setSearchParams, {
                    movementKind: event.target.value
                  })
                }
              >
                {movementKindOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="De">
                <Input
                  type="date"
                  value={historyDateFrom}
                  onChange={(event) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      historyDateFrom: event.target.value
                    })
                  }
                />
              </Field>
              <Field label="Ate">
                <Input
                  type="date"
                  value={historyDateTo}
                  onChange={(event) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      historyDateTo: event.target.value
                    })
                  }
                />
              </Field>
            </div>
          </Card>

          {movementsQuery.isPending ? <PageLoader label="Carregando historico..." /> : null}

          {movementsQuery.isError ? (
            <EmptyState
              title="Nao foi possivel carregar o historico"
              message="Confira a conexao com o backend e tente novamente."
            />
          ) : null}

          {!movementsQuery.isPending && !movementsQuery.isError && (movementsQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <p className="text-sm text-[var(--jam-subtle)]">Nenhuma movimentacao encontrada para os filtros atuais.</p>
            </Card>
          ) : null}

          <div className="space-y-3">
            {movementsQuery.data?.map((movement) => (
              <Card key={movement.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{movement.productName}</p>
                    <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{movement.sku}</p>
                  </div>
                  <MovementQuantityBadge effect={movement.balanceEffect} quantity={movement.quantity} />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--jam-ink)]">{movement.movementLabel}</p>
                  <p className="text-sm text-[var(--jam-subtle)]">{movement.referenceLabel}</p>
                  <p className="text-sm text-[var(--jam-subtle)]">{formatDateTime(movement.createdAt)}</p>
                </div>

                {movement.note ? <p className="text-sm text-[var(--jam-subtle)]">{movement.note}</p> : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "saidas" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Visitas desde">
                <Input
                  type="date"
                  value={outflowDateFrom}
                  onChange={(event) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      outflowDateFrom: event.target.value
                    })
                  }
                />
              </Field>
              <Field label="Visitas ate">
                <Input
                  type="date"
                  value={outflowDateTo}
                  onChange={(event) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      outflowDateTo: event.target.value
                    })
                  }
                />
              </Field>
            </div>
          </Card>

          {outflowsQuery.isPending ? <PageLoader label="Carregando saidas..." /> : null}

          {outflowsQuery.isError ? (
            <EmptyState
              title="Nao foi possivel carregar as saidas"
              message="Confira a conexao com o backend e tente novamente."
            />
          ) : null}

          {!outflowsQuery.isPending && !outflowsQuery.isError && (outflowsQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <p className="text-sm text-[var(--jam-subtle)]">
                Nenhuma reposicao para cliente encontrada nesse periodo.
              </p>
            </Card>
          ) : null}

          <div className="space-y-3">
            {outflowsQuery.data?.map((group) => (
              <Link key={group.visitId} to={`/visits/${group.visitId}`}>
                <Card className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{group.clientTradeName}</p>
                      <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">
                        {group.visitCode} · {formatDateTime(group.visitedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Total enviado</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{group.totalUnits} un.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--jam-ink)]">{item.productName}</p>
                          <p className="truncate text-sm text-[var(--jam-subtle)]">{item.sku}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-[var(--jam-ink)]">{item.quantity} un.</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function MovementQuantityBadge({ effect, quantity }: { effect: "IN" | "OUT" | "NEUTRAL"; quantity: number }) {
  const className =
    effect === "IN"
      ? "bg-[rgba(15,118,110,0.1)] text-[var(--jam-success)]"
      : effect === "OUT"
        ? "bg-[rgba(180,35,24,0.08)] text-[var(--jam-danger)]"
        : "bg-slate-100 text-slate-700";
  const sign = effect === "IN" ? "+" : effect === "OUT" ? "-" : "i";

  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}>{sign} {quantity}</span>;
}

function updateStockSearchParams(
  currentParams: URLSearchParams,
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void,
  updates: Record<string, string>
) {
  const nextParams = new URLSearchParams(currentParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  });

  setSearchParams(nextParams, { replace: true });
}
