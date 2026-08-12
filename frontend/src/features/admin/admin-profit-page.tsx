import { useState, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { Button, DateInput, ErrorBanner, Field, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminProfit, type CostCoverageStatus } from "./admin-api";
import { AdminEmptyBlock, AdminInfoPanel, AdminQueryErrorState } from "./admin-ui";

type ProfitFilters = { dateFrom: string; dateTo: string };
type ReviewItem = { productId: string; name: string; sku: string; soldUnits: number; revenueAmount: number; referenceItems: number; missingItems: number; stage: "PARCIAL" | "PENDENTE" };

export function AdminProfitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const periodKey = `${dateFrom}|${dateTo}`;
  const [draftFilterState, setDraftFilterState] = useState(() => ({
    periodKey,
    filters: { dateFrom, dateTo }
  }));
  const draftFilters = draftFilterState.periodKey === periodKey ? draftFilterState.filters : { dateFrom, dateTo };
  const setDraftFilters = (nextValue: SetStateAction<ProfitFilters>) => {
    setDraftFilterState((current) => {
      const currentFilters = current.periodKey === periodKey ? current.filters : { dateFrom, dateTo };
      const nextFilters = typeof nextValue === "function" ? nextValue(currentFilters) : nextValue;
      return { periodKey, filters: nextFilters };
    });
  };
  const invalidPeriod = draftFilters.dateFrom.length > 0 && draftFilters.dateTo.length > 0 && new Date(draftFilters.dateFrom).getTime() > new Date(draftFilters.dateTo).getTime();
  const profitQuery = useQuery({ queryKey: ["admin", "profit", dateFrom, dateTo], queryFn: () => getAdminProfit({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }) });

  if (profitQuery.isPending) return <PageLoader label="Carregando lucro..." />;
  if (profitQuery.isError || !profitQuery.data) return <AdminQueryErrorState title="Não foi possível carregar o lucro" error={profitQuery.error} onRetry={() => void profitQuery.refetch()} />;

  const { summary, coverage, topProductsByProfit, productsWithoutCost, productsWithReferenceCost } = profitQuery.data;
  const resultTotal = coverage.confirmed.revenueAmount + coverage.reference.revenueAmount + coverage.missing.revenueAmount;
  const coveragePercent = toPercent(coverage.confirmed.revenueAmount, resultTotal);
  const reviewItems = mergeReviewItems(productsWithReferenceCost, productsWithoutCost);
  const applyFilters = () => setSearchParams(toSearchParams(draftFilters));
  const clearFilters = () => {
    setDraftFilters({ dateFrom: "", dateTo: "" });
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-2">
      <PageHeader backTo="/admin/dashboard" backLabel="Resumo" title="Lucro das vendas" subtitle="Resultado bruto das vendas concluídas." />

      <details className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--jam-ink)] [&::-webkit-details-marker]:hidden"><span>Período</span><span className="text-[12px] font-medium text-[var(--jam-accent)]">Alterar</span></summary>
        <div className="mt-3 border-t border-[var(--jam-border)] pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data inicial"><DateInput value={draftFilters.dateFrom} onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))} /></Field>
            <Field label="Data final"><DateInput value={draftFilters.dateTo} onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))} /></Field>
          </div>
          {invalidPeriod ? <div className="mt-3"><ErrorBanner message="A data inicial não pode ser maior que a data final." /></div> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={applyFilters} disabled={invalidPeriod} className="w-full sm:w-auto">Aplicar período</Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={clearFilters}>Limpar filtro</Button>
          </div>
        </div>
      </details>

      {resultTotal <= 0 ? <AdminEmptyBlock title="Sem vendas concluídas" message="Ainda não há vendas para calcular o lucro neste período." /> : (
        <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <dl className="grid divide-y divide-[var(--jam-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <ProfitMetric label="Lucro bruto estimado" value={summary.estimatedGrossProfitAmount === null ? "—" : formatCurrency(summary.estimatedGrossProfitAmount)} note={summary.estimatedGrossProfitAmount === null ? "Há custo pendente de apuração" : "Base de custo disponível"} />
            <ProfitMetric label="Receita vendida" value={formatCurrency(summary.revenueAmount)} note={`${summary.soldUnits} unidade(s) vendida(s)`} />
            <ProfitMetric label="Receita apurada" value={`${coveragePercent.toFixed(0)}%`} note={`${formatCurrency(coverage.confirmed.revenueAmount)} · ${coverage.confirmed.visitItemsCount} item(ns) com custo real`} />
          </dl>
        </section>
      )}

      <AdminInfoPanel title="Como ler o lucro">
        <p><strong className="font-semibold text-[var(--jam-ink)]">Custo real:</strong> o item possui custo de compra cadastrado.</p>
        <p><strong className="font-semibold text-[var(--jam-ink)]">Em revisão:</strong> o cálculo usa um custo de referência e merece conferência.</p>
        <p><strong className="font-semibold text-[var(--jam-ink)]">Sem custo:</strong> não existe base suficiente para calcular o lucro daquele item.</p>
      </AdminInfoPanel>

      <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <SectionHeading title="Pendências de custo" action={<Link to="/products"><Button variant="secondary">Abrir produtos</Button></Link>} />
        {reviewItems.length === 0 ? <div className="mt-3"><AdminEmptyBlock title="Nenhuma pendência neste período" message="Todas as vendas deste recorte possuem custo apurado." /></div> : (
          <div className="mt-3 divide-y divide-[var(--jam-border)]">
            {reviewItems.map((item) => <ReviewRow key={item.productId} item={item} />)}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <SectionHeading title="Produtos com maior lucro" action={null} />
        {topProductsByProfit.length === 0 ? <div className="mt-3"><AdminEmptyBlock title="Sem resultado apurado" message="Ainda não há itens com custo fechado para comparar." /></div> : (
          <div className="mt-3 divide-y divide-[var(--jam-border)]">
            {topProductsByProfit.map((product) => <ProfitProductRow key={product.productId} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfitMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="min-w-0 px-3.5 py-3 sm:px-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-subtle)]">{label}</dt><dd className="mt-2 font-display text-[1.32rem] font-semibold leading-none text-[var(--jam-ink)]">{value}</dd><p className="mt-2 text-[12px] leading-5 text-[var(--jam-subtle)]">{note}</p></div>;
}

function SectionHeading({ title, action }: { title: string; action: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="min-w-0 text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">{title}</h2>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const pending = item.stage === "PENDENTE";
  return <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{item.name}</p><ToneBadge label={pending ? "Sem custo" : "Em revisão"} tone={pending ? "danger" : "warning"} /></div><p className="mt-1 break-words text-[12px] leading-5 text-[var(--jam-subtle)]">{buildReviewSubtitle(item)}</p></div><p className="shrink-0 text-[13px] font-semibold text-[var(--jam-ink)] sm:text-right">{item.soldUnits} un. · {formatCurrency(item.revenueAmount)}</p></div>;
}

function ProfitProductRow({ product }: { product: { sku: string; name: string; soldUnits: number; revenueAmount: number; estimatedGrossProfitAmount: number; costCoverageStatus: CostCoverageStatus } }) {
  const stage = mapStage(product.costCoverageStatus);
  return <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{product.name}</p><ToneBadge label={stage.label} tone={stage.tone} /></div><p className="mt-1 break-words text-[12px] leading-5 text-[var(--jam-subtle)]">{product.sku} · {product.soldUnits} un. · vendido {formatCurrency(product.revenueAmount)}</p></div><p className="shrink-0 text-[14px] font-semibold text-[var(--jam-ink)] sm:text-right">{formatCurrency(product.estimatedGrossProfitAmount)}</p></div>;
}

function mergeReviewItems(productsWithReferenceCost: Array<{ productId: string; sku: string; name: string; soldUnits: number; revenueAmount: number; referenceVisitItems: number }>, productsWithoutCost: Array<{ productId: string; sku: string; name: string; soldUnits: number; revenueAmount: number; missingVisitItems: number }>) {
  const reviewMap = new Map<string, ReviewItem>();
  for (const product of productsWithReferenceCost) reviewMap.set(product.productId, { productId: product.productId, name: product.name, sku: product.sku, soldUnits: product.soldUnits, revenueAmount: product.revenueAmount, referenceItems: product.referenceVisitItems, missingItems: 0, stage: "PARCIAL" });
  for (const product of productsWithoutCost) { const current = reviewMap.get(product.productId) ?? { productId: product.productId, name: product.name, sku: product.sku, soldUnits: 0, revenueAmount: 0, referenceItems: 0, missingItems: 0, stage: "PENDENTE" as const }; reviewMap.set(product.productId, { ...current, soldUnits: Math.max(current.soldUnits, product.soldUnits), revenueAmount: Math.max(current.revenueAmount, product.revenueAmount), missingItems: product.missingVisitItems, stage: current.referenceItems > 0 ? "PARCIAL" : "PENDENTE" }); }
  return [...reviewMap.values()].sort((left, right) => left.stage !== right.stage ? (left.stage === "PENDENTE" ? -1 : 1) : right.revenueAmount - left.revenueAmount).slice(0, 8);
}

function buildReviewSubtitle(item: ReviewItem) { if (item.referenceItems > 0 && item.missingItems > 0) return `${item.sku} · ${item.referenceItems} item(ns) com referência · ${item.missingItems} pendente(s)`; if (item.referenceItems > 0) return `${item.sku} · ${item.referenceItems} item(ns) usando referência`; return `${item.sku} · ${item.missingItems} item(ns) sem custo`; }
function mapStage(status: CostCoverageStatus) { if (status === "CONFIRMED") return { label: "Apurado", tone: "success" as const }; if (status === "MISSING") return { label: "Sem custo", tone: "danger" as const }; return { label: "Em revisão", tone: "warning" as const }; }
function toPercent(value: number, total: number) { return total <= 0 || value <= 0 ? 0 : Math.min((value / total) * 100, 100); }
function toSearchParams(filters: ProfitFilters) { const params = new URLSearchParams(); if (filters.dateFrom) params.set("dateFrom", filters.dateFrom); if (filters.dateTo) params.set("dateTo", filters.dateTo); return params; }
