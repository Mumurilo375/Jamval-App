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
        description="Panorama rapido do tamanho da base e do volume consolidado."
      >
        <div className="grid gap-2.5 grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Produtos cadastrados" value={String(summary.totalProducts)} />
          <AdminMetricCard label="Produtos ativos" value={String(summary.activeProducts)} />
          <AdminMetricCard label="Clientes ativos" value={String(summary.activeClients)} />
          <AdminMetricCard label="Visitas concluidas" value={String(summary.completedVisits)} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Financeiro"
        title="Leitura financeira"
        description="Totais consolidados da carteira gerada nas visitas concluidas."
      >
        <div className="grid gap-2.5 grid-cols-2 xl:grid-cols-3">
          <AdminMetricCard
            label="Total vendido"
            value={formatCurrency(summary.totalSoldAmount)}
          />
          <AdminMetricCard
            label="Total recebido"
            value={formatCurrency(summary.totalReceivedAmount)}
            tone="success"
          />
          <AdminMetricCard
            label="Total pendente"
            value={formatCurrency(summary.totalPendingAmount)}
            tone={summary.totalPendingAmount > 0 ? "warning" : "neutral"}
          />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Estoque"
        title="Saldo do estoque principal"
        description="Saldo consolidado do estoque principal e itens que ainda precisam de custo."
        action={
          <Link to="/stock">
            <Button variant="secondary" className="w-full sm:w-auto">
              Abrir estoque
            </Button>
          </Link>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <AdminMetricCard
            label="Saldo do estoque principal"
            value={`${summary.centralStockUnits} un.`}
          />
          <AdminMetricCard
            label="Produtos sem custo"
            value={String(summary.productsWithoutCost)}
            tone={summary.productsWithoutCost > 0 ? "warning" : "success"}
          />
        </div>

        {lowStockProducts.length === 0 ? (
          <AdminEmptyBlock
            title="Sem alerta imediato"
            message="Nao houve produtos ativos suficientes para montar a lista de menor saldo."
          />
        ) : (
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <AdminListRow
                key={product.productId}
                title={product.name}
                subtitle={`${product.sku} · menor saldo entre os produtos ativos`}
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
