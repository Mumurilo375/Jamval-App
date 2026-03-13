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
        eyebrow="Cadastros"
        title="Produtos"
        subtitle="SKUs e base comercial para abastecer clientes e abrir visitas."
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
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{product.name}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{product.sku}</p>
              </div>
              <StatusBadge active={product.isActive} />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--jam-subtle)]">{product.brand ?? "Sem marca"} · {product.category ?? "Sem categoria"}</p>
                <div className="mt-2 grid gap-1">
                  <p className="text-sm font-semibold text-[var(--jam-ink)]">Preco base: {formatCurrency(Number(product.basePrice))}</p>
                  <p className="text-sm text-[var(--jam-subtle)]">
                    Custo de compra: {product.costPrice === null ? "Sem custo cadastrado" : formatCurrency(Number(product.costPrice))}
                  </p>
                </div>
              </div>
              <Link to={`/products/${product.id}/edit`}>
                <Button variant="secondary" className="min-h-10 px-3">
                  Editar
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
