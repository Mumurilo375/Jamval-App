import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, PageHeader, PageLoader, Select, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { listProducts } from "./products-api";

export function ProductsListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      isActive: status === "all" ? undefined : status === "active"
    }),
    [search, status]
  );

  const productsQuery = useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts(filters)
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Produtos"
        subtitle="Cadastre SKUs e mantenha o catalogo base limpo para a operacao."
        action={
          <Link to="/products/new">
            <Button>Novo</Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <Field label="Busca">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por SKU, nome ou marca" />
        </Field>

        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </Select>
        </Field>
      </Card>

      {productsQuery.isPending ? <PageLoader label="Carregando produtos..." /> : null}

      {productsQuery.isError ? (
        <EmptyState title="Falha ao carregar produtos" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!productsQuery.isPending && !productsQuery.isError && productsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhum produto encontrado"
          message="Comece cadastrando os itens principais do consignado."
          action={
            <Link to="/products/new">
              <Button>Criar primeiro produto</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {productsQuery.data?.map((product) => (
          <Card key={product.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{product.name}</p>
                <p className="text-sm text-[var(--jam-subtle)]">{product.sku}</p>
              </div>
              <StatusBadge active={product.isActive} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Preco</p>
                <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">{formatCurrency(product.basePrice)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Marca</p>
                <p className="mt-1 text-base font-semibold text-[var(--jam-ink)]">{product.brand ?? "-"}</p>
              </div>
            </div>

            <Link to={`/products/${product.id}/edit`}>
              <Button variant="secondary" className="w-full">
                Editar produto
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
