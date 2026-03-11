import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { listClients } from "../clients/clients-api";
import { listProducts } from "../products/products-api";

export function DashboardPage() {
  const productsQuery = useQuery({
    queryKey: ["dashboard", "products"],
    queryFn: () => listProducts({})
  });
  const clientsQuery = useQuery({
    queryKey: ["dashboard", "clients"],
    queryFn: () => listClients({})
  });

  if (productsQuery.isPending || clientsQuery.isPending) {
    return <PageLoader label="Montando painel..." />;
  }

  if (productsQuery.error || clientsQuery.error) {
    return <EmptyState title="Nao foi possivel carregar o painel" message="Confira a conexao com o backend e tente novamente." />;
  }

  const products = productsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const activeProducts = products.filter((item) => item.isActive).length;
  const activeClients = clients.filter((item) => item.isActive).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Painel" subtitle="Atalhos rapidos para o comeco da operacao mobile." />

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,238,214,0.96))]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Produtos</p>
          <p className="mt-2 font-display text-3xl font-bold">{products.length}</p>
          <p className="mt-2 text-sm text-[var(--jam-subtle)]">{activeProducts} ativos</p>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(226,243,235,0.96))]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Clientes</p>
          <p className="mt-2 font-display text-3xl font-bold">{clients.length}</p>
          <p className="mt-2 text-sm text-[var(--jam-subtle)]">{activeClients} ativos</p>
        </Card>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Proximos passos</p>
        <div className="mt-4 grid gap-3">
          <Link to="/visits">
            <Button className="w-full justify-between">
              <span>Abrir visitas draft</span>
              <span>→</span>
            </Button>
          </Link>
          <Link to="/products">
            <Button variant="secondary" className="w-full justify-between">
              <span>Gerenciar produtos</span>
              <span>→</span>
            </Button>
          </Link>
          <Link to="/clients">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--jam-border)]">
              <span>Gerenciar clientes</span>
              <span>→</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
