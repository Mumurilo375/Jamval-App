import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, DateInput, ErrorBanner, Field, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminProfit, type CostCoverageStatus } from "./admin-api";
import { AdminEmptyBlock, AdminListRow, AdminMetricCard, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

type ProfitFilters = {
  dateFrom: string;
  dateTo: string;
};

type ReviewItem = {
  productId: string;
  name: string;
  sku: string;
  soldUnits: number;
  revenueAmount: number;
  referenceItems: number;
  missingItems: number;
  stage: "PARCIAL" | "PENDENTE";
};

export function AdminProfitPage() {
  const [draftFilters, setDraftFilters] = useState<ProfitFilters>({ dateFrom: "", dateTo: "" });
  const [filters, setFilters] = useState<ProfitFilters>({ dateFrom: "", dateTo: "" });
  const invalidPeriod =
    draftFilters.dateFrom.length > 0 &&
    draftFilters.dateTo.length > 0 &&
    new Date(draftFilters.dateFrom).getTime() > new Date(draftFilters.dateTo).getTime();
  const profitQuery = useQuery({
    queryKey: ["admin", "profit", filters],
    queryFn: () => getAdminProfit({ dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined })
  });

  if (profitQuery.isPending) {
    return <PageLoader label="Carregando resultado..." />;
  }

  if (profitQuery.isError || !profitQuery.data) {
    return (
      <AdminQueryErrorState
        title="Nao foi possivel carregar o resultado"
        error={profitQuery.error}
        onRetry={() => void profitQuery.refetch()}
      />
    );
  }

  const { summary, coverage, topProductsByProfit, topProductsBySales, productsWithoutCost, productsWithReferenceCost } =
    profitQuery.data;
  const resultTotal = coverage.confirmed.revenueAmount + coverage.reference.revenueAmount + coverage.missing.revenueAmount;
  const maxProfit = Math.max(...topProductsByProfit.map((product) => product.estimatedGrossProfitAmount), 1);
  const maxSoldUnits = Math.max(...topProductsBySales.map((product) => product.soldUnits), 1);
  const reviewItems = mergeReviewItems(productsWithReferenceCost, productsWithoutCost);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-2">
      <PageHeader
        eyebrow="Administracao"
        title="Lucro das vendas"
        subtitle="Leitura simples do que ja esta apurado, do que ainda esta em revisao e do que segue sem custo."
      />

      <AdminSectionCard eyebrow="Periodo" title="Periodo" description="Escolha o recorte das vendas concluidas.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data inicial">
            <DateInput
              value={draftFilters.dateFrom}
              onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
            />
          </Field>
          <Field label="Data final">
            <DateInput
              value={draftFilters.dateTo}
              onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
            />
          </Field>
        </div>
        {invalidPeriod ? <ErrorBanner message="A data inicial nao pode ser maior que a data final." /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => setFilters(draftFilters)} disabled={invalidPeriod} className="w-full sm:w-auto">
            Aplicar periodo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              const cleared = { dateFrom: "", dateTo: "" };
              setDraftFilters(cleared);
              setFilters(cleared);
            }}
          >
            Limpar filtro
          </Button>
        </div>
      </AdminSectionCard>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Lucro ja apurado"
          value={summary.estimatedGrossProfitAmount === null ? "-" : formatCurrency(summary.estimatedGrossProfitAmount)}
          hint={summary.estimatedGrossProfitAmount === null ? "Ainda falta apurar custo." : "Parte ja fechada do periodo."}
          tone={summary.estimatedGrossProfitAmount === null && summary.revenueAmount > 0 ? "warning" : "neutral"}
        />
        <AdminMetricCard
          label="Vendas ja apuradas"
          value={formatCurrency(coverage.confirmed.revenueAmount)}
          hint={`${coverage.confirmed.soldUnits} un. com custo apurado.`}
          tone={coverage.confirmed.revenueAmount > 0 ? "success" : "neutral"}
        />
        <AdminMetricCard
          label="Vendas em revisao"
          value={formatCurrency(coverage.reference.revenueAmount)}
          hint={`${coverage.reference.soldUnits} un. ainda usando referencia.`}
          tone={coverage.reference.revenueAmount > 0 ? "warning" : "neutral"}
        />
        <AdminMetricCard
          label="Vendas sem custo"
          value={formatCurrency(coverage.missing.revenueAmount)}
          hint={`${coverage.missing.soldUnits} un. ainda sem custo.`}
          tone={coverage.missing.revenueAmount > 0 ? "warning" : "neutral"}
        />
      </div>

      <AdminSectionCard
        eyebrow="Leitura"
        title="Ja apurado, em revisao e sem custo"
        description="Ja apurado entrou no lucro. Em revisao ainda usa referencia. Sem custo ainda espera base real."
      >
        {resultTotal <= 0 ? (
          <AdminEmptyBlock title="Sem vendas concluidas" message="Ainda nao ha vendas suficientes neste recorte para montar esta leitura." />
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--jam-border)] bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--jam-ink)]">Lucro ja apurado</p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">
                    {summary.estimatedGrossProfitAmount === null ? "Ainda falta apurar parte do custo." : "Base ja apurada neste periodo."}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-[var(--jam-ink)]">
                  {summary.estimatedGrossProfitAmount === null ? "-" : formatCurrency(summary.estimatedGrossProfitAmount)}
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
                <div className="flex h-full w-full">
                  <div className="bg-[rgba(15,118,110,0.8)]" style={{ width: `${toPercent(coverage.confirmed.revenueAmount, resultTotal)}%` }} />
                  <div className="bg-[rgba(180,83,9,0.75)]" style={{ width: `${toPercent(coverage.reference.revenueAmount, resultTotal)}%` }} />
                  <div className="bg-[rgba(180,35,24,0.72)]" style={{ width: `${toPercent(coverage.missing.revenueAmount, resultTotal)}%` }} />
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <StageCard title="Ja apurado" note="Custo real ja encontrado" value={formatCurrency(coverage.confirmed.revenueAmount)} itemCount={coverage.confirmed.visitItemsCount} tone="success" />
              <StageCard title="Em revisao" note="Ainda usando referencia" value={formatCurrency(coverage.reference.revenueAmount)} itemCount={coverage.reference.visitItemsCount} tone="warning" />
              <StageCard title="Sem custo" note="Ainda sem base de custo" value={formatCurrency(coverage.missing.revenueAmount)} itemCount={coverage.missing.visitItemsCount} tone="danger" />
            </div>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Revisao"
        title="O que precisa revisao"
        description="Produtos com venda parcial ou pendente neste recorte."
        action={<Link to="/products"><Button variant="secondary" className="w-full sm:w-auto">Abrir produtos</Button></Link>}
      >
        {reviewItems.length === 0 ? (
          <AdminEmptyBlock title="Nada para revisar" message="Nao ha produtos com venda parcial ou pendente neste recorte." />
        ) : (
          <div className="space-y-2">
            {reviewItems.map((item) => (
              <AdminListRow
                key={item.productId}
                title={item.name}
                subtitle={buildReviewSubtitle(item)}
                value={`${item.soldUnits} un. · ${formatCurrency(item.revenueAmount)}`}
                badge={<ToneBadge label={item.stage === "PENDENTE" ? "Pendente" : "Parcial"} tone={item.stage === "PENDENTE" ? "danger" : "warning"} />}
              />
            ))}
          </div>
        )}
      </AdminSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard eyebrow="Resultado" title="Produtos com maior resultado" description="Quem mais contribuiu no periodo.">
          {topProductsByProfit.length === 0 ? (
            <AdminEmptyBlock title="Sem base fechada" message="Ainda nao ha itens suficientes com resultado fechado para montar este ranking." />
          ) : (
            <div className="space-y-2">
              {topProductsByProfit.map((product) => (
                <RankingRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · ${product.soldUnits} un. · vendido ${formatCurrency(product.revenueAmount)}`}
                  value={formatCurrency(product.estimatedGrossProfitAmount)}
                  progress={(product.estimatedGrossProfitAmount / maxProfit) * 100}
                  stage={mapStage(product.costCoverageStatus)}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard eyebrow="Giro" title="Produtos com maior giro" description="Volume vendido com leitura visual do status do custo.">
          {topProductsBySales.length === 0 ? (
            <AdminEmptyBlock title="Sem vendas concluidas" message="Nao houve itens vendidos suficientes para montar o ranking neste periodo." />
          ) : (
            <div className="space-y-2">
              {topProductsBySales.map((product) => (
                <RankingRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · vendido ${formatCurrency(product.revenueAmount)}`}
                  value={`${product.soldUnits} un.`}
                  progress={(product.soldUnits / maxSoldUnits) * 100}
                  stage={mapStage(product.costCoverageStatus)}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}

function mergeReviewItems(
  productsWithReferenceCost: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    referenceVisitItems: number;
  }>,
  productsWithoutCost: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    missingVisitItems: number;
  }>
) {
  const reviewMap = new Map<string, ReviewItem>();

  for (const product of productsWithReferenceCost) {
    reviewMap.set(product.productId, {
      productId: product.productId,
      name: product.name,
      sku: product.sku,
      soldUnits: product.soldUnits,
      revenueAmount: product.revenueAmount,
      referenceItems: product.referenceVisitItems,
      missingItems: 0,
      stage: "PARCIAL"
    });
  }

  for (const product of productsWithoutCost) {
    const current =
      reviewMap.get(product.productId) ??
      {
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        soldUnits: 0,
        revenueAmount: 0,
        referenceItems: 0,
        missingItems: 0,
        stage: "PENDENTE" as const
      };

    reviewMap.set(product.productId, {
      ...current,
      soldUnits: Math.max(current.soldUnits, product.soldUnits),
      revenueAmount: Math.max(current.revenueAmount, product.revenueAmount),
      missingItems: product.missingVisitItems,
      stage: current.referenceItems > 0 ? "PARCIAL" : "PENDENTE"
    });
  }

  return [...reviewMap.values()]
    .sort((left, right) => {
      if (left.stage !== right.stage) {
        return left.stage === "PENDENTE" ? -1 : 1;
      }

      return right.revenueAmount - left.revenueAmount;
    })
    .slice(0, 8);
}

function buildReviewSubtitle(item: ReviewItem) {
  if (item.referenceItems > 0 && item.missingItems > 0) {
    return `${item.sku} · ${item.referenceItems} item(ns) com referencia · ${item.missingItems} item(ns) pendente(s)`;
  }

  if (item.referenceItems > 0) {
    return `${item.sku} · ${item.referenceItems} item(ns) ainda usando referencia`;
  }

  return `${item.sku} · ${item.missingItems} item(ns) ainda sem custo`;
}

function mapStage(status: CostCoverageStatus) {
  if (status === "CONFIRMED") {
    return { label: "Apurado", tone: "success" as const };
  }

  if (status === "MISSING") {
    return { label: "Sem custo", tone: "danger" as const };
  }

  return { label: "Revisao", tone: "warning" as const };
}

function toPercent(value: number, total: number) {
  if (total <= 0 || value <= 0) {
    return 0;
  }

  return Math.min((value / total) * 100, 100);
}

function StageCard({
  title,
  note,
  value,
  itemCount,
  tone
}: {
  title: string;
  note: string;
  value: string;
  itemCount: number;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{title}</p>
            <ToneBadge label={title} tone={tone} />
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">{note}</p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-[var(--jam-ink)]">{value}</p>
      </div>
      <p className="mt-3 text-[12px] text-[var(--jam-subtle)]">{itemCount} item(ns) no periodo.</p>
    </div>
  );
}

function RankingRow({
  title,
  subtitle,
  value,
  progress,
  stage
}: {
  title: string;
  subtitle: string;
  value: string;
  progress: number;
  stage: {
    label: string;
    tone: "success" | "warning" | "danger";
  };
}) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-[var(--jam-ink)]">{title}</p>
            <ToneBadge label={stage.label} tone={stage.tone} />
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">{subtitle}</p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-[var(--jam-ink)]">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
        <div
          className={
            stage.tone === "success"
              ? "h-full rounded-full bg-[rgba(15,118,110,0.78)]"
              : stage.tone === "danger"
                ? "h-full rounded-full bg-[rgba(180,35,24,0.76)]"
                : "h-full rounded-full bg-[rgba(180,83,9,0.78)]"
          }
          style={{ width: `${Math.max(6, Math.min(progress, 100))}%` }}
        />
      </div>
    </div>
  );
}
