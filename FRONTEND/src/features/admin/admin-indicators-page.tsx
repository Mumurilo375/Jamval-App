import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, PageHeader, PageLoader, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminIndicators } from "./admin-api";
import {
  AdminBarRow,
  AdminEmptyBlock,
  AdminListRow,
  AdminMetricCard,
  AdminQueryErrorState,
  AdminSectionCard
} from "./admin-ui";

export function AdminIndicatorsPage() {
  const indicatorsQuery = useQuery({
    queryKey: ["admin", "indicators"],
    queryFn: () => getAdminIndicators()
  });

  if (indicatorsQuery.isPending) {
    return <PageLoader label="Carregando indicadores..." />;
  }

  if (indicatorsQuery.isError || !indicatorsQuery.data) {
    return (
      <AdminQueryErrorState
        title="Nao foi possivel carregar os indicadores"
        error={indicatorsQuery.error}
        onRetry={() => void indicatorsQuery.refetch()}
      />
    );
  }

  const { counts, productsWithoutCost, productsWithoutCentralStock, topSellingProducts, topClientsByOutstanding } =
    indicatorsQuery.data;
  const maxSoldUnits = Math.max(...topSellingProducts.map((product) => product.soldUnits), 1);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Indicadores"
        subtitle="Leituras diretas para reposicao, cobertura de custo, carteira e giro."
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
        <AdminMetricCard
          label="Produtos sem saldo"
          value={String(counts.productsWithoutCentralStock)}
          tone={counts.productsWithoutCentralStock > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Produtos sem custo de referencia"
          value={String(counts.productsWithoutCost)}
          tone={counts.productsWithoutCost > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Clientes com maior pendencia"
          value={String(counts.clientsWithOutstanding)}
          tone={counts.clientsWithOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          eyebrow="Reposicao"
          title="Reposicao imediata"
          description="Itens ativos sem saldo no estoque principal."
          action={
            <Link to="/stock">
              <Button variant="secondary" className="w-full sm:w-auto">
                Abrir estoque
              </Button>
            </Link>
          }
        >
          {productsWithoutCentralStock.length === 0 ? (
            <AdminEmptyBlock
              title="Sem alerta de reposicao"
              message="Todos os produtos ativos listados tem saldo no estoque principal."
            />
          ) : (
            <div className="space-y-2">
              {productsWithoutCentralStock.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · item ativo sem saldo disponivel`}
                  value={`${product.currentQuantity} un.`}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Cobertura"
          title="Cobertura de custo"
          description="Produtos que ainda precisam de custo de referencia para reduzir fallback no lucro."
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
              title="Boa cobertura de referencia"
              message="Os produtos listados nesta amostra ja possuem custo de referencia cadastrado."
            />
          ) : (
            <div className="space-y-2">
              {productsWithoutCost.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · Preco base ${formatCurrency(product.basePrice)}`}
                  value={product.isActive ? "Ativo" : "Inativo"}
                  badge={<StatusBadge active={product.isActive} />}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Carteira"
          title="Clientes com maior pendencia"
          description="Leitura curta de quem concentra o maior valor em aberto."
          action={
            <Link to="/financeiro">
              <Button variant="secondary" className="w-full sm:w-auto">
                Abrir financeiro
              </Button>
            </Link>
          }
        >
          {topClientsByOutstanding.length === 0 ? (
            <AdminEmptyBlock
              title="Carteira sem pendencias"
              message="Nao ha clientes com valor em aberto nesta leitura da base."
            />
          ) : (
            <div className="space-y-2">
              {topClientsByOutstanding.map((client) => (
                <AdminListRow
                  key={client.clientId}
                  title={client.tradeName}
                  subtitle={`${client.receivableCount} titulo(s) em aberto`}
                  value={formatCurrency(client.outstandingAmount)}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Giro"
          title="Produtos com maior giro"
          description="Volume vendido nas visitas concluidas, com leitura visual simples."
        >
          {topSellingProducts.length === 0 ? (
            <AdminEmptyBlock
              title="Ainda sem volume suficiente"
              message="Nao ha itens vendidos em visitas concluidas para montar este ranking."
            />
          ) : (
            <div className="space-y-2">
              {topSellingProducts.map((product) => (
                <AdminBarRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · Receita ${formatCurrency(product.revenueAmount)}`}
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
