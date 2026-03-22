import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  DateInput,
  DrawerPanel,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageLoader,
  Select,
  ToneBadge
} from "../../components/ui";
import { cx } from "../../lib/cx";
import { formatCurrency, formatDateTime } from "../../lib/format";
import {
  getCentralOverview,
  listCentralMovements,
  listCentralVisitOutflows,
  type CentralMovement,
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
  { value: "DIRECT_SALE_OUT", label: "Saidas por venda" },
  { value: "DEFECTIVE_RETURN_LOG", label: "Retornos com defeito" }
];

const ATTENTION_LIMIT = 6;

export function StockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const activeTab =
    searchParams.get("tab") === "historico" || searchParams.get("tab") === "saidas"
      ? searchParams.get("tab")!
      : "saldo";
  const balanceSearch = searchParams.get("balanceSearch") ?? "";
  const legacyBalanceCategory = searchParams.get("balanceCategory") ?? "";
  const selectedCategories = useMemo(() => {
    const values = parseMultiValue(searchParams.get("balanceCategories"));
    return values.length > 0 ? values : legacyBalanceCategory ? [legacyBalanceCategory] : [];
  }, [legacyBalanceCategory, searchParams]);
  const selectedCategorySet = useMemo(() => new Set(selectedCategories), [selectedCategories]);
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

  const categoryOptions = useMemo(() => {
    const groups = new Map<string, { label: string; itemCount: number; totalUnits: number }>();

    for (const item of overviewQuery.data?.items ?? []) {
      const label = getCategoryLabel(item.category);
      const current = groups.get(label) ?? { label, itemCount: 0, totalUnits: 0 };
      current.itemCount += 1;
      current.totalUnits += item.currentQuantity;
      groups.set(label, current);
    }

    return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [overviewQuery.data?.items]);

  const filteredBalanceItems = useMemo(() => {
    const search = balanceSearch.trim().toLocaleLowerCase();

    return [...(overviewQuery.data?.items ?? [])]
      .filter((item) => {
        const category = getCategoryLabel(item.category);

        if (selectedCategorySet.size > 0 && !selectedCategorySet.has(category)) {
          return false;
        }

        if (!search) {
          return true;
        }

        return `${item.name} ${item.category ?? ""} ${item.sku}`.toLocaleLowerCase().includes(search);
      })
      .sort(compareItemsByOperationalPriority);
  }, [balanceSearch, overviewQuery.data?.items, selectedCategorySet]);

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
  const filteredProductsWithoutStock = filteredBalanceItems.filter(
    (item) => item.currentQuantity <= 0
  ).length;
  const filteredUnitsTotal = filteredBalanceItems.reduce(
    (total, item) => total + item.currentQuantity,
    0
  );
  const attentionItems = filteredBalanceItems.slice(0, ATTENTION_LIMIT);
  const highlightedItemIds = new Set(attentionItems.map((item) => item.productId));
  const selectedCategorySummary =
    selectedCategories.length === 0
      ? null
      : selectedCategories.length <= 3
        ? selectedCategories.join(" • ")
        : `${selectedCategories.slice(0, 3).join(" • ")} +${selectedCategories.length - 3}`;
  const categoryButtonLabel =
    selectedCategories.length > 0
      ? `Filtrar categorias (${selectedCategories.length})`
      : "Filtrar categorias";

  const updateParams = (updates: Record<string, string>) =>
    updateStockSearchParams(searchParams, setSearchParams, updates);

  const toggleCategory = (category: string) => {
    const next = selectedCategorySet.has(category)
      ? selectedCategories.filter((entry) => entry !== category)
      : [...selectedCategories, category].sort((left, right) => left.localeCompare(right));

    updateParams({
      balanceCategories: next.join(","),
      balanceCategory: ""
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Estoque"
        title="Estoque"
        subtitle="Consulte o saldo e movimente o estoque."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.8fr)_minmax(0,1fr)]">
          <section className="space-y-2 border-b border-[var(--jam-border)] px-4 py-3 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">
              Resumo do recorte
            </p>

            <div className="grid grid-cols-3 gap-3">
              <CompactStat label="Produtos" value={String(filteredBalanceItems.length)} />
              <CompactStat label="Unidades" value={`${filteredUnitsTotal} un.`} />
              <CompactStat label="Sem saldo" value={String(filteredProductsWithoutStock)} />
            </div>
          </section>

          <section className="space-y-2 border-b border-[var(--jam-border)] px-4 py-3 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">
              Ultimo lancamento
            </p>

            {summary.lastMovement ? (
              <div className="space-y-2">
                <ToneBadge
                  label={getCompactMovementLabel(summary.lastMovement.label)}
                  tone={getMovementTone(summary.lastMovement.balanceEffect)}
                />
                <p className="text-base font-semibold text-[var(--jam-ink)]">
                  {formatOperationalDateTime(summary.lastMovement.createdAt)}
                </p>
                <p className="text-sm text-[var(--jam-subtle)]">
                  {getMovementEffectLabel(summary.lastMovement.balanceEffect)}
                </p>
              </div>
            ) : (
              <p className="text-base font-semibold text-[var(--jam-ink)]">Sem lancamento ainda</p>
            )}
          </section>

          <section className="space-y-2 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">
              Movimentar estoque
            </p>

            <div className="grid gap-2">
              <ActionLink
                to="/stock/manual-entry"
                title="Entrada manual"
                subtitle="Nova mercadoria"
              />
              <ActionLink
                to="/stock/manual-adjustment"
                title="Ajuste manual"
                subtitle="Corrigir saldo"
              />
              {summary.canUseInitialLoad ? (
                <ActionLink
                  to="/stock/initial-load"
                  title="Carga inicial"
                  subtitle="Primeiro estoque"
                />
              ) : null}
            </div>
          </section>
        </div>

        <div className="border-t border-[var(--jam-border)] bg-[rgba(15,23,42,0.03)] p-2">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateParams({ tab: tab.value })}
                className={
                  activeTab === tab.value
                    ? "rounded-xl bg-[var(--jam-accent)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white sm:text-[11px]"
                    : "rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-subtle)] transition hover:bg-[rgba(15,23,42,0.05)] sm:text-[11px]"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {activeTab === "saldo" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Field label="Buscar">
                  <Input
                    placeholder="Produto ou categoria"
                    value={balanceSearch}
                    onChange={(event) => updateParams({ balanceSearch: event.target.value })}
                  />
                </Field>
              </div>

              <div className="sm:pt-6">
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setIsCategoryDrawerOpen(true)}
                >
                  {categoryButtonLabel}
                </Button>
              </div>
            </div>

            {selectedCategorySummary ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--jam-subtle)]">
                <span className="font-medium text-[var(--jam-ink)]">Categorias ativas:</span>
                <span>{selectedCategorySummary}</span>
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--jam-accent)]"
                  onClick={() => updateParams({ balanceCategories: "", balanceCategory: "" })}
                >
                  Limpar
                </button>
              </div>
            ) : null}
          </Card>

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
              <p className="text-sm text-[var(--jam-subtle)]">
                Nenhum produto encontrado para os filtros atuais.
              </p>
            </Card>
          ) : (
            <>
              <Card className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                      Precisando de reposicao
                    </p>
                    <p className="mt-1 text-sm text-[var(--jam-subtle)]">
                      Sem saldo primeiro. Depois, os menores saldos da lista atual.
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--jam-ink)]">
                    {filteredProductsWithoutStock} sem saldo neste recorte
                  </p>
                </div>

                <div className="grid gap-2">
                  {attentionItems.map((item) => (
                    <PriorityRow key={`attention-${item.productId}`} item={item} />
                  ))}
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <div className="divide-y divide-[var(--jam-border)]">
                  {filteredBalanceItems.map((item) => (
                    <article
                      key={item.productId}
                      className={cx(
                        "px-4 py-3 transition hover:bg-[rgba(15,23,42,0.02)]",
                        item.currentQuantity <= 0 && "bg-[rgba(180,35,24,0.04)]",
                        item.currentQuantity > 0 &&
                          highlightedItemIds.has(item.productId) &&
                          "bg-[rgba(180,83,9,0.05)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                              {item.name}
                            </p>
                            {!item.isActive ? <ToneBadge label="Inativo" tone="neutral" /> : null}
                            {item.currentQuantity <= 0 ? (
                              <ToneBadge label="Sem saldo" tone="danger" />
                            ) : highlightedItemIds.has(item.productId) ? (
                              <ToneBadge label="Baixa quantia" tone="warning" />
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-[var(--jam-subtle)]">
                            {getCategoryLabel(item.category)}
                          </p>

                          <p className="mt-2 text-xs text-[var(--jam-subtle)]">
                            {formatStockRowMovement(item.lastMovement)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold leading-none text-[var(--jam-ink)]">
                            {item.currentQuantity}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                            un.
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {activeTab === "historico" ? (
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_1fr_1fr]">
              <Field label="Busca">
                <Input
                  placeholder="Produto, referencia ou observacao"
                  value={historySearch}
                  onChange={(event) => updateParams({ historySearch: event.target.value })}
                />
              </Field>

              <Field label="Tipo">
                <Select
                  value={historyMovementKind}
                  onChange={(event) => updateParams({ movementKind: event.target.value })}
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
                  onValueChange={(value) => updateParams({ historyDateFrom: value })}
                />
              </Field>

              <Field label="Ate">
                <DateInput
                  value={historyDateTo}
                  onValueChange={(value) => updateParams({ historyDateTo: value })}
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
              <p className="text-sm text-[var(--jam-subtle)]">
                Nenhuma movimentacao encontrada para os filtros atuais.
              </p>
            </Card>
          ) : null}

          {movementsQuery.data && movementsQuery.data.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_160px_96px_148px] gap-3 border-b border-[var(--jam-border)] bg-[rgba(15,23,42,0.04)] px-4 py-3 lg:grid">
                <ColumnLabel>Produto</ColumnLabel>
                <ColumnLabel>Tipo</ColumnLabel>
                <ColumnLabel>Qtd</ColumnLabel>
                <ColumnLabel className="text-right">Quando</ColumnLabel>
              </div>

              <div className="divide-y divide-[var(--jam-border)]">
                {movementsQuery.data.map((movement) => (
                  <article key={movement.id} className="px-4 py-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_160px_96px_148px] lg:items-start">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                          {movement.productName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
                          {getCategoryLabel(movement.productCategory)}
                        </p>
                      </div>

                      <MovementTypeBadge label={movement.movementLabel} />
                      <MovementQuantityBadge effect={movement.balanceEffect} quantity={movement.quantity} />
                      <p className="text-sm text-[var(--jam-subtle)] lg:text-right">
                        {formatDateTime(movement.createdAt)}
                      </p>

                      <div className="grid gap-1 text-sm text-[var(--jam-subtle)] lg:col-span-4">
                        <p>{movement.referenceLabel}</p>
                        {movement.note ? <p>{movement.note}</p> : null}
                        {movement.unitCost !== null ? (
                          <p className="font-medium text-[var(--jam-ink)]">
                            {formatMovementCost(movement)}
                          </p>
                        ) : null}
                      </div>
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
                  onValueChange={(value) => updateParams({ outflowDateFrom: value })}
                />
              </Field>

              <Field label="Visitas ate">
                <DateInput
                  value={outflowDateTo}
                  onValueChange={(value) => updateParams({ outflowDateTo: value })}
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
                Nenhuma saida de visita encontrada nesse periodo.
              </p>
            </Card>
          ) : null}

          {outflowsQuery.data && outflowsQuery.data.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--jam-border)]">
                {outflowsQuery.data.map((group) => (
                  <Link
                    key={group.visitId}
                    to={`/visits/${group.visitId}`}
                    className="block px-4 py-3 transition hover:bg-[rgba(29,78,216,0.04)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                          {group.clientTradeName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
                          {formatDateTime(group.visitedAt)} • {group.visitCode}
                        </p>
                        <div className="mt-2 text-sm text-[var(--jam-subtle)]">
                          {renderOutflowItemsSummary(group.items)}
                        </div>
                      </div>

                      <div className="text-left sm:min-w-[160px] sm:text-right">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                          Total enviado
                        </p>
                        <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">
                          {group.totalUnits} un.
                        </p>
                        <p className="mt-2 text-xs font-medium text-[var(--jam-accent)]">Abrir visita</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <DrawerPanel
        open={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        title="Categorias"
        description="Marque uma ou mais categorias para filtrar o saldo atual."
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="ghost"
              onClick={() => updateParams({ balanceCategories: "", balanceCategory: "" })}
            >
              Limpar
            </Button>
            <Button onClick={() => setIsCategoryDrawerOpen(false)}>Fechar</Button>
          </div>
        }
      >
        {categoryOptions.length === 0 ? (
          <p className="text-sm text-[var(--jam-subtle)]">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="space-y-2">
            {categoryOptions.map((category) => {
              const checked = selectedCategorySet.has(category.label);

              return (
                <label
                  key={category.label}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--jam-ink)]">{category.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--jam-subtle)]">
                      {category.itemCount} produto(s) • {category.totalUnits} un.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category.label)}
                    className="h-4 w-4 shrink-0 accent-[var(--jam-accent)]"
                  />
                </label>
              );
            })}
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}

function ActionLink({ to, title, subtitle }: { to: string; title: string; subtitle: string }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5 transition hover:border-[rgba(29,78,216,0.26)] hover:bg-[rgba(29,78,216,0.03)]"
    >
      <p className="text-sm font-semibold text-[var(--jam-ink)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--jam-subtle)]">{subtitle}</p>
    </Link>
  );
}

function PriorityRow({ item }: { item: CentralOverview["items"][number] }) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-3 rounded-xl border px-3 py-3",
        item.currentQuantity <= 0
          ? "border-[rgba(180,35,24,0.18)] bg-[rgba(180,35,24,0.05)]"
          : "border-[rgba(180,83,9,0.18)] bg-[rgba(180,83,9,0.05)]"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{item.name}</p>
        <p className="mt-0.5 text-xs text-[var(--jam-subtle)]">{getCategoryLabel(item.category)}</p>
        <p className="mt-2 text-xs text-[var(--jam-subtle)]">
          {item.currentQuantity <= 0 ? "Sem saldo no momento" : "Entre os menores saldos do recorte"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold leading-none text-[var(--jam-ink)]">{item.currentQuantity}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
          un.
        </p>
      </div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-[var(--jam-border)] pl-3 first:border-l-0 first:pl-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function ColumnLabel({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cx("text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]", className)}>
      {children}
    </p>
  );
}

function MovementTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[rgba(15,23,42,0.06)] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-ink)]">
      {label}
    </span>
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

  return (
    <span className={`inline-flex min-h-10 w-full items-center justify-center rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}>
      {sign} {quantity}
    </span>
  );
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

function formatStockRowMovement(
  movement: { label: string; createdAt: string } | null
) {
  if (!movement) {
    return "Sem movimentacao ainda";
  }

  return `${getCompactMovementLabel(movement.label)} • ${formatOperationalDateTime(movement.createdAt)}`;
}

function renderOutflowItemsSummary(items: Array<{ productName: string; quantity: number }>) {
  const visibleItems = items.slice(0, 2);

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {visibleItems.map((item, index) => (
        <Fragment key={`${item.productName}-${index}`}>
          {index > 0 ? <span className="text-[var(--jam-subtle)]">•</span> : null}
          <span className="font-semibold text-[var(--jam-ink)]">{item.productName}</span>
        </Fragment>
      ))}
      {items.length > 2 ? (
        <span className="text-[var(--jam-subtle)]">+{items.length - 2} item(ns)</span>
      ) : null}
    </p>
  );
}

function compareItemsByOperationalPriority(
  left: CentralOverview["items"][number],
  right: CentralOverview["items"][number]
) {
  if (left.currentQuantity !== right.currentQuantity) {
    return left.currentQuantity - right.currentQuantity;
  }

  return left.name.localeCompare(right.name);
}

function getCategoryLabel(category: string | null | undefined) {
  return category?.trim() ? category : "Sem categoria";
}

function getCompactMovementLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase();

  if (normalized === "carga inicial") {
    return "Carga inicial";
  }

  if (normalized === "entrada manual") {
    return "Entrada";
  }

  if (normalized.startsWith("ajuste")) {
    return "Ajuste";
  }

  if (normalized === "saida para cliente") {
    return "Saida cliente";
  }

  if (normalized === "saida por venda") {
    return "Venda";
  }

  if (normalized === "retorno com defeito") {
    return "Defeito";
  }

  return label;
}

function getMovementTone(effect: "IN" | "OUT" | "NEUTRAL") {
  if (effect === "IN") {
    return "success";
  }

  if (effect === "OUT") {
    return "warning";
  }

  return "neutral";
}

function getMovementEffectLabel(effect: "IN" | "OUT" | "NEUTRAL") {
  if (effect === "IN") {
    return "Entrada no estoque";
  }

  if (effect === "OUT") {
    return "Saida do estoque";
  }

  return "Ajuste no estoque";
}

function formatMovementCost(movement: CentralMovement) {
  if (movement.unitCost === null) {
    return "";
  }

  if (movement.totalCost === null) {
    return `Custo un.: ${formatCurrency(movement.unitCost)}`;
  }

  return `Custo un.: ${formatCurrency(movement.unitCost)} • Total: ${formatCurrency(movement.totalCost)}`;
}

function parseMultiValue(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
