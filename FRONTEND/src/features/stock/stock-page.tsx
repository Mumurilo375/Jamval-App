import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  DateInput,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageLoader,
  Select,
  ToneBadge
} from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import {
  getCentralOverview,
  listCentralMovements,
  listCentralVisitOutflows,
  type CentralMovementKind,
  type CentralOverview
} from "./stock-api";

const tabs = [
  { value: "saldo", label: "Saldo atual" },
  { value: "historico", label: "Historico" },
  { value: "saidas", label: "Saidas das visitas" }
] as const;

const movementKindOptions: Array<{ value: "" | CentralMovementKind; label: string }> = [
  { value: "", label: "Todos os movimentos" },
  { value: "INITIAL_LOAD", label: "Carga inicial" },
  { value: "MANUAL_ENTRY", label: "Entrada manual" },
  { value: "MANUAL_ADJUSTMENT", label: "Ajustes" },
  { value: "RESTOCK_TO_CLIENT", label: "Saidas para clientes" },
  { value: "DIRECT_SALE_OUT", label: "Vendas diretas" },
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
  const productsWithoutStock = Math.max(items.length - summary.productsWithStock, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Estoque"
        title="Saldo atual"
        subtitle="Veja quanto tem, o que entrou e o que saiu sem carregar a operacao."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <TopMetric label="Total em estoque" value={`${summary.totalUnits} un.`} />
        <TopMetric label="Produtos sem saldo" value={String(productsWithoutStock)} />
        <TopMetric
          label="Ultimo lancamento"
          value={summary.lastMovement ? formatMovementSnapshot(summary.lastMovement) : "Sem lancamento"}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link to="/stock/manual-entry" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Entrada manual</Button>
        </Link>
        <Link to="/stock/manual-adjustment" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">
            Ajuste manual
          </Button>
        </Link>
        {summary.canUseInitialLoad ? (
          <Link to="/stock/initial-load" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto">
              Carga inicial
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateStockSearchParams(searchParams, setSearchParams, { tab: tab.value })}
            className={
              activeTab === tab.value
                ? "rounded-xl border border-[rgba(29,78,216,0.24)] bg-[rgba(29,78,216,0.06)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-accent)] sm:px-3 sm:text-[11px]"
                : "rounded-xl border border-[var(--jam-border)] bg-white px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-subtle)] sm:px-3 sm:text-[11px]"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "saldo" ? (
        <div className="space-y-3">
          <Field label="Buscar produto">
            <Input
              placeholder="Nome ou SKU"
              value={balanceSearch}
              onChange={(event) =>
                updateStockSearchParams(searchParams, setSearchParams, {
                  balanceSearch: event.target.value
                })
              }
            />
          </Field>

          {items.length === 0 ? (
            <EmptyState
              title="Nenhum produto cadastrado"
              message="Cadastre produtos para comecar a controlar o estoque."
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
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--jam-border)]">
                {filteredBalanceItems.map((item) => (
                  <article key={item.productId} className="px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{item.name}</p>
                          {!item.isActive ? <ToneBadge label="Inativo" tone="neutral" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-[var(--jam-subtle)]">{item.sku}</p>
                      </div>

                      <div className="grid gap-2 sm:min-w-[280px] sm:grid-cols-2 sm:text-right">
                        <StockLineMetric label="Saldo atual" value={`${item.currentQuantity} un.`} emphasize />
                        <StockLineMetric
                          label="Ultima movimentacao"
                          value={item.lastMovement ? formatMovementSnapshot(item.lastMovement) : "Sem lancamento"}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      {activeTab === "historico" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_1fr_1fr]">
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

              <Field label="Tipo">
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

              <Field label="De">
                <DateInput
                  value={historyDateFrom}
                  onValueChange={(value) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      historyDateFrom: value
                    })
                  }
                />
              </Field>

              <Field label="Ate">
                <DateInput
                  value={historyDateTo}
                  onValueChange={(value) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      historyDateTo: value
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

          {movementsQuery.data && movementsQuery.data.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--jam-border)]">
                {movementsQuery.data.map((movement) => (
                  <article key={movement.id} className="px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{movement.productName}</p>
                          <MovementQuantityBadge effect={movement.balanceEffect} quantity={movement.quantity} />
                        </div>
                        <p className="mt-1 text-sm text-[var(--jam-subtle)]">{movement.sku}</p>
                        <p className="mt-2 text-sm font-medium text-[var(--jam-ink)]">{movement.movementLabel}</p>
                        <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{movement.referenceLabel}</p>
                        {movement.note ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{movement.note}</p> : null}
                      </div>

                      <p className="shrink-0 text-sm text-[var(--jam-subtle)]">{formatDateTime(movement.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "saidas" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Visitas desde">
                <DateInput
                  value={outflowDateFrom}
                  onValueChange={(value) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      outflowDateFrom: value
                    })
                  }
                />
              </Field>

              <Field label="Visitas ate">
                <DateInput
                  value={outflowDateTo}
                  onValueChange={(value) =>
                    updateStockSearchParams(searchParams, setSearchParams, {
                      outflowDateTo: value
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
              <p className="text-sm text-[var(--jam-subtle)]">Nenhuma saida de visita encontrada nesse periodo.</p>
            </Card>
          ) : null}

          {outflowsQuery.data && outflowsQuery.data.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--jam-border)]">
                {outflowsQuery.data.map((group) => (
                  <Link key={group.visitId} to={`/visits/${group.visitId}`} className="block px-4 py-3 transition hover:bg-[rgba(29,78,216,0.04)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{group.clientTradeName}</p>
                        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
                          {group.visitCode} • {formatDateTime(group.visitedAt)}
                        </p>
                        <p className="mt-2 text-sm text-[var(--jam-subtle)]">{summarizeOutflowItems(group.items)}</p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Total enviado</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{group.totalUnits} un.</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--jam-ink)] sm:text-base">{value}</p>
    </Card>
  );
}

function StockLineMetric({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className={emphasize ? "mt-1 text-sm font-semibold text-[var(--jam-ink)] sm:text-base" : "mt-1 text-sm text-[var(--jam-ink)]"}>
        {value}
      </p>
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

function formatMovementSnapshot(movement: NonNullable<CentralOverview["summary"]["lastMovement"]>) {
  return `${movement.label} • ${formatOperationalDateTime(movement.createdAt)}`;
}

function formatOperationalDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(midnight);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (date >= midnight) {
    return `hoje ${time}`;
  }

  if (date >= yesterday && date < midnight) {
    return `ontem ${time}`;
  }

  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} ${time}`;
}

function summarizeOutflowItems(items: Array<{ productName: string; quantity: number }>) {
  const visibleItems = items.slice(0, 2).map((item) => `${item.productName} (${item.quantity} un.)`);

  if (items.length <= 2) {
    return visibleItems.join(" • ");
  }

  return `${visibleItems.join(" • ")} +${items.length - 2} item(ns)`;
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
