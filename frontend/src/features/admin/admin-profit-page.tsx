import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, ErrorBanner, Field, Input, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminProfit } from "./admin-api";
import { AdminEmptyBlock, AdminInfoPanel, AdminListRow, AdminMetricCard, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

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
    return <AdminQueryErrorState title="Nao foi possivel carregar o lucro" error={profitQuery.error} onRetry={() => void profitQuery.refetch()} />;
  }

  const { summary, topProductsByProfit, topProductsBySales, productsWithoutCost } = profitQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Lucro bruto estimado"
        subtitle="Leitura gerencial baseada no preco cobrado na visita e no custo historico salvo no momento da conclusao."
      />

      <AdminInfoPanel title="Como este calculo funciona" tone="warning">
        <p>Entra no calculo: itens vendidos em visitas concluidas com custo historico salvo.</p>
        <p>Nao entra: reposicao, trocas, perdas, devolucoes com defeito e despesas operacionais.</p>
      </AdminInfoPanel>

      <AdminSectionCard
        eyebrow="Periodo"
        title="Filtrar o recorte"
        description="Use a data da visita concluida para ler um periodo especifico ou deixe em branco para considerar toda a base."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data inicial">
            <Input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </Field>
          <Field label="Data final">
            <Input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard
          label="Lucro bruto estimado"
          value={formatCurrency(summary.estimatedGrossProfitAmount)}
          hint="Considera apenas itens vendidos com custo historico disponivel."
        />
        <AdminMetricCard
          label="Receita considerada"
          value={formatCurrency(summary.revenueAmount)}
          hint="Soma dos itens vendidos dentro do recorte selecionado."
        />
        <AdminMetricCard
          label="Unidades vendidas"
          value={`${summary.soldUnits} un.`}
          hint="Quantidade vendida nas visitas concluidas consideradas."
        />
        <AdminMetricCard
          label="Vendas sem custo considerado"
          value={formatCurrency(summary.salesAmountWithoutCost)}
          hint="Receita que ficou fora do lucro por falta de custo historico."
          tone={summary.salesAmountWithoutCost > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Itens sem custo no periodo"
          value={String(summary.visitItemsWithoutCost)}
          hint="Quantidade de itens vendidos sem custo historico salvo."
          tone={summary.visitItemsWithoutCost > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Produtos sem custo no periodo"
          value={String(summary.distinctProductsWithoutCost)}
          hint="Produtos que ainda pedem revisao de cadastro."
          tone={summary.distinctProductsWithoutCost > 0 ? "warning" : "success"}
        />
      </div>

      <AdminSectionCard
        eyebrow="Cobertura"
        title="Produtos sem custo considerado"
        description="Esses produtos vendidos ficaram fora do lucro bruto estimado porque nao havia custo historico salvo para os itens."
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
            title="Boa cobertura de custo neste recorte"
            message="Nenhum produto vendido ficou sem custo historico suficiente neste periodo."
          />
        ) : (
          <div className="space-y-2">
            {productsWithoutCost.map((product) => (
              <AdminListRow
                key={product.productId}
                title={product.name}
                subtitle={`${product.sku} · ${product.missingVisitItems} item(ns) vendidos sem custo historico`}
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
          title="Produtos com maior lucro bruto estimado"
          description="Ordenacao feita apenas com itens que possuem custo historico salvo."
        >
          {topProductsByProfit.length === 0 ? (
            <AdminEmptyBlock
              title="Sem base suficiente para calcular lucro"
              message="Nao houve itens vendidos com custo historico suficiente neste periodo."
            />
          ) : (
            <div className="space-y-2">
              {topProductsByProfit.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · ${product.soldUnits} un. · Receita ${formatCurrency(product.revenueAmount)}`}
                  value={formatCurrency(product.estimatedGrossProfitAmount)}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Volume"
          title="Produtos mais vendidos"
          description="Leitura de volume para comparar giro com o resultado de lucro bruto estimado."
        >
          {topProductsBySales.length === 0 ? (
            <AdminEmptyBlock
              title="Sem vendas concluidas no recorte"
              message="Nao houve itens vendidos suficientes para montar o ranking neste periodo."
            />
          ) : (
            <div className="space-y-2">
              {topProductsBySales.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · Receita ${formatCurrency(product.revenueAmount)}`}
                  value={
                    product.estimatedGrossProfitAmount === null
                      ? "Sem custo historico suficiente"
                      : `${product.soldUnits} un. · lucro ${formatCurrency(product.estimatedGrossProfitAmount)}`
                  }
                />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
