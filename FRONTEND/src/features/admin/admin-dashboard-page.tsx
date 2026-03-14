import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getAdminDashboard } from "./admin-api";
import { AdminEmptyBlock, AdminListRow, AdminMetricCard, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

export function AdminDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getAdminDashboard()
  });

  if (dashboardQuery.isPending) {
    return <PageLoader label="Carregando dashboard..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <AdminQueryErrorState title="Nao foi possivel carregar o dashboard" error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />;
  }

  const { summary, lowStockProducts } = dashboardQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Dashboard"
        subtitle="Leitura rapida da operacao, do financeiro e do estoque central com base em dados reais do sistema."
      />

      <AdminSectionCard
        eyebrow="Operacao"
        title="Base operacional"
        description="Panorama rapido do tamanho da base e do volume de visitas ja concluido."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Produtos cadastrados"
            value={String(summary.totalProducts)}
            hint="Todos os SKUs existentes hoje no sistema."
          />
          <AdminMetricCard
            label="Produtos ativos"
            value={String(summary.activeProducts)}
            hint="Itens disponiveis para operar no dia a dia."
          />
          <AdminMetricCard
            label="Clientes ativos"
            value={String(summary.activeClients)}
            hint="Clientes atualmente ativos para visita e carteira."
          />
          <AdminMetricCard
            label="Visitas concluidas"
            value={String(summary.completedVisits)}
            hint="Visitas ja fechadas e consolidadas na base."
          />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Financeiro"
        title="Leitura financeira"
        description="Totais consolidados a partir das visitas concluidas e dos titulos gerados."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AdminMetricCard
            label="Total vendido nas visitas concluidas"
            value={formatCurrency(summary.totalSoldAmount)}
            hint="Soma do valor apurado nas visitas fechadas."
          />
          <AdminMetricCard
            label="Total recebido"
            value={formatCurrency(summary.totalReceivedAmount)}
            hint="Valor ja recebido e registrado no financeiro."
            tone="success"
          />
          <AdminMetricCard
            label="Total pendente"
            value={formatCurrency(summary.totalPendingAmount)}
            hint="Valor que ainda permanece em aberto na carteira."
            tone={summary.totalPendingAmount > 0 ? "warning" : "neutral"}
          />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Estoque"
        title="Cobertura administrativa do estoque"
        description="Leitura rapida do saldo central e dos produtos que ainda precisam de custo cadastrado."
        action={
          <Link to="/stock">
            <Button variant="secondary" className="w-full sm:w-auto">
              Abrir estoque
            </Button>
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard
            label="Unidades no estoque central"
            value={`${summary.centralStockUnits} un.`}
            hint="Soma do saldo disponivel hoje no estoque central."
          />
          <AdminMetricCard
            label="Produtos sem custo cadastrado"
            value={String(summary.productsWithoutCost)}
            hint="Itens que ainda nao entram corretamente no lucro bruto estimado."
            tone={summary.productsWithoutCost > 0 ? "warning" : "success"}
          />
        </div>

        {lowStockProducts.length === 0 ? (
          <AdminEmptyBlock
            title="Nenhum alerta de estoque nesta amostra"
            message="Nao houve produtos ativos suficientes para montar a lista de menor saldo."
          />
        ) : (
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <AdminListRow
                key={product.productId}
                title={product.name}
                subtitle={`${product.sku} · saldo atual mais baixo entre os produtos ativos`}
                value={`${product.currentQuantity} un.`}
                badge={product.costPriceMissing ? <ToneBadge label="Sem custo" tone="warning" /> : undefined}
              />
            ))}
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
