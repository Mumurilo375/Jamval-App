import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, DateInput, ErrorBanner, Field, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminProfit } from "./admin-api";
import {
  AdminBarRow,
  AdminEmptyBlock,
  AdminInfoPanel,
  AdminListRow,
  AdminMetricCard,
  AdminQueryErrorState,
  AdminSectionCard
} from "./admin-ui";

type ProfitFilters = {
  dateFrom: string;
  dateTo: string;
};

export function AdminProfitPage() {
  const [draftFilters, setDraftFilters] = useState<ProfitFilters>({
    dateFrom: "",
    dateTo: ""
  });
  const [filters, setFilters] = useState<ProfitFilters>({
    dateFrom: "",
    dateTo: ""
  });
  const invalidPeriod =
    draftFilters.dateFrom.length > 0 &&
    draftFilters.dateTo.length > 0 &&
    new Date(draftFilters.dateFrom).getTime() > new Date(draftFilters.dateTo).getTime();
  const profitQuery = useQuery({
    queryKey: ["admin", "profit", filters],
    queryFn: () =>
      getAdminProfit({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      })
  });

  if (profitQuery.isPending) {
    return <PageLoader label="Carregando lucro..." />;
  }

  if (profitQuery.isError || !profitQuery.data) {
    return (
      <AdminQueryErrorState
        title="Nao foi possivel carregar o lucro"
        error={profitQuery.error}
        onRetry={() => void profitQuery.refetch()}
      />
    );
  }

  const { summary, topProductsByProfit, topProductsBySales, productsWithoutCost } = profitQuery.data;
  const estimatedCostAmount = Math.max(summary.revenueAmount - summary.estimatedGrossProfitAmount, 0);
  const marginPercent =
    summary.revenueAmount > 0 ? (summary.estimatedGrossProfitAmount / summary.revenueAmount) * 100 : null;
  const maxProfit = Math.max(...topProductsByProfit.map((product) => product.estimatedGrossProfitAmount), 1);
  const maxSoldUnits = Math.max(...topProductsBySales.map((product) => product.soldUnits), 1);
  const profitShare =
    summary.revenueAmount > 0 ? Math.max((summary.estimatedGrossProfitAmount / summary.revenueAmount) * 100, 0) : 0;
  const costShare = summary.revenueAmount > 0 ? Math.max((estimatedCostAmount / summary.revenueAmount) * 100, 0) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Lucro bruto estimado"
        subtitle="Leitura gerencial baseada em vendas concluidas com custo historico disponivel."
      />

      <AdminInfoPanel title="Escopo do calculo">
        <p>Entra no calculo o que foi vendido em visitas concluidas com custo historico salvo.</p>
        <p>Ficam fora despesas operacionais, reposicoes, perdas e itens vendidos sem custo historico.</p>
      </AdminInfoPanel>

      <AdminSectionCard
        eyebrow="Periodo"
        title="Filtrar o recorte"
        description="Use a data da visita concluida ou deixe em branco para considerar toda a base."
      >
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

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <AdminMetricCard label="Lucro bruto estimado" value={formatCurrency(summary.estimatedGrossProfitAmount)} />
        <AdminMetricCard
          label="Margem bruta estimada"
          value={marginPercent === null ? "-" : `${marginPercent.toFixed(1)}%`}
        />
        <AdminMetricCard label="Receita considerada" value={formatCurrency(summary.revenueAmount)} />
        <AdminMetricCard
          label="Receita fora do calculo"
          value={formatCurrency(summary.salesAmountWithoutCost)}
          tone={summary.salesAmountWithoutCost > 0 ? "warning" : "success"}
        />
      </div>

      <AdminSectionCard
        eyebrow="Composicao"
        title="Receita considerada"
        description={`${summary.soldUnits} unidade(s) vendidas entram nesta leitura.`}
      >
        {summary.revenueAmount <= 0 ? (
          <AdminEmptyBlock
            title="Sem base suficiente"
            message="Ainda nao ha vendas concluidas com base suficiente para montar a composicao."
          />
        ) : (
          <div className="space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
              <div className="flex h-full w-full">
                <div className="bg-[rgba(29,78,216,0.22)]" style={{ width: `${Math.min(costShare, 100)}%` }} />
                <div className="bg-[var(--jam-accent)]" style={{ width: `${Math.min(profitShare, 100)}%` }} />
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <AdminListRow
                title="Custo estimado"
                subtitle="Parte da receita considerada que virou custo historico."
                value={formatCurrency(estimatedCostAmount)}
              />
              <AdminListRow
                title="Lucro bruto estimado"
                subtitle="Parte restante da receita considerada apos o custo historico."
                value={formatCurrency(summary.estimatedGrossProfitAmount)}
              />
            </div>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Cobertura"
        title="Produtos fora do calculo"
        description="Produtos vendidos sem custo historico suficiente e que ficaram fora do lucro bruto estimado."
        action={
          <Link to="/products">
            <Button variant="secondary" className="w-full sm:w-auto">
              Abrir produtos
            </Button>
          </Link>
        }
      >
        {productsWithoutCost.length === 0 ? (
          <AdminEmptyBlock
            title="Boa cobertura de custo"
            message="Nenhum produto vendido ficou fora do calculo neste recorte."
          />
        ) : (
          <div className="space-y-2">
            {productsWithoutCost.map((product) => (
              <AdminListRow
                key={product.productId}
                title={product.name}
                subtitle={`${product.sku} · ${product.missingVisitItems} item(ns) sem custo historico`}
                value={`${product.soldUnits} un. · ${formatCurrency(product.revenueAmount)}`}
                badge={<ToneBadge label="Sem custo" tone="warning" />}
              />
            ))}
          </div>
        )}
      </AdminSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          eyebrow="Ranking"
          title="Maior lucro bruto estimado"
          description="Ordenacao feita apenas com itens que possuem custo historico salvo."
        >
          {topProductsByProfit.length === 0 ? (
            <AdminEmptyBlock
              title="Sem base suficiente"
              message="Nao houve itens vendidos com custo historico suficiente neste periodo."
            />
          ) : (
            <div className="space-y-2">
              {topProductsByProfit.map((product) => (
                <AdminBarRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · ${product.soldUnits} un. · Receita ${formatCurrency(product.revenueAmount)}`}
                  value={formatCurrency(product.estimatedGrossProfitAmount)}
                  progress={(product.estimatedGrossProfitAmount / maxProfit) * 100}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Giro"
          title="Maior volume vendido"
          description="Comparacao entre giro e lucro bruto estimado dentro do mesmo recorte."
        >
          {topProductsBySales.length === 0 ? (
            <AdminEmptyBlock
              title="Sem vendas concluidas"
              message="Nao houve itens vendidos suficientes para montar o ranking neste periodo."
            />
          ) : (
            <div className="space-y-2">
              {topProductsBySales.map((product) => (
                <AdminBarRow
                  key={product.productId}
                  title={product.name}
                  subtitle={
                    product.estimatedGrossProfitAmount === null
                      ? `${product.sku} · sem custo historico suficiente`
                      : `${product.sku} · lucro ${formatCurrency(product.estimatedGrossProfitAmount)}`
                  }
                  value={`${product.soldUnits} un.`}
                  progress={(product.soldUnits / maxSoldUnits) * 100}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
