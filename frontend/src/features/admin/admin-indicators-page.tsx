import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, PageHeader, PageLoader, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminIndicators } from "./admin-api";
import { AdminEmptyBlock, AdminListRow, AdminMetricCard, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

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

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Indicadores"
        subtitle="Leituras de acao para custo, estoque, venda e carteira, com foco em priorizar o que precisa de correcao."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard
          label="Produtos sem custo"
          value={String(counts.productsWithoutCost)}
          hint="Impactam diretamente a cobertura do lucro bruto estimado."
          tone={counts.productsWithoutCost > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Produtos sem estoque"
          value={String(counts.productsWithoutCentralStock)}
          hint="Itens ativos sem saldo no estoque central."
          tone={counts.productsWithoutCentralStock > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Clientes com pendencia"
          value={String(counts.clientsWithOutstanding)}
          hint="Clientes que ainda possuem valor em aberto na carteira."
          tone={counts.clientsWithOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          eyebrow="Prioridade 1"
          title="Produtos sem custo cadastrado"
          description="Comece por aqui para ampliar a confiabilidade do lucro bruto estimado."
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
              message="Os produtos listados nesta amostra ja possuem custo de compra cadastrado."
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
          eyebrow="Prioridade 2"
          title="Produtos sem estoque central"
          description="Itens ativos sem saldo agora, o que pode travar reposicao e giro."
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
              title="Sem alerta de saldo nesta leitura"
              message="Todos os produtos ativos listados tem saldo positivo no estoque central."
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
          eyebrow="Prioridade 3"
          title="Clientes com maior pendencia"
          description="Carteira agrupada por cliente para leitura rapida do valor ainda em aberto."
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
              title="Carteira sem pendencias agora"
              message="Nao ha clientes com valor em aberto nesta leitura da base."
            />
          ) : (
            <div className="space-y-2">
              {topClientsByOutstanding.map((client) => (
                <AdminListRow
                  key={client.clientId}
                  title={client.tradeName}
                  subtitle={`${client.receivableCount} titulo(s) em aberto na carteira`}
                  value={formatCurrency(client.outstandingAmount)}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Prioridade 4"
          title="Produtos mais vendidos"
          description="Leitura de giro para identificar os itens com maior volume nas visitas concluidas."
        >
          {topSellingProducts.length === 0 ? (
            <AdminEmptyBlock
              title="Ainda sem volume de vendas suficiente"
              message="Nao ha itens vendidos em visitas concluidas para montar este ranking."
            />
          ) : (
            <div className="space-y-2">
              {topSellingProducts.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={`${product.sku} · Receita ${formatCurrency(product.revenueAmount)}`}
                  value={`${product.soldUnits} un.`}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
