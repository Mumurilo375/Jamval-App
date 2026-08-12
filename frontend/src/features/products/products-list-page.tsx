import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  PaginationControls,
  RetryableErrorState,
  Select,
  StatusBadge,
} from "../../components/ui";
import { formatCount, formatCurrency } from "../../lib/format";
import { paginateItems } from "../../lib/pagination";
import { listProducts } from "./products-api";

const PRODUCTS_PAGE_SIZE = 6;

export function ProductsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const search = searchParams.get("search") ?? "";
  const status = normalizeStatusFilter(searchParams.get("status"));
  const deferredSearch = useDeferredValue(search);

  const filters = useMemo(
    () => ({
      search: deferredSearch.trim() || undefined,
      isActive: status === "all" ? undefined : status === "active",
    }),
    [deferredSearch, status],
  );

  const productsQuery = useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts(filters),
  });
  const paginatedProducts = paginateItems(
    productsQuery.data ?? [],
    page,
    PRODUCTS_PAGE_SIZE,
  );
  const headerSubtitle = productsQuery.data
    ? `${formatCount(productsQuery.data.length, "produto")} no recorte atual`
    : undefined;
  const hasActiveFilters = search.trim().length > 0 || status !== "all";

  const updateFilters = (updates: { search?: string; status?: "all" | "active" | "inactive" }) => {
    const nextParams = new URLSearchParams(searchParams);

    if (updates.search !== undefined) {
      if (updates.search.trim()) {
        nextParams.set("search", updates.search);
      } else {
        nextParams.delete("search");
      }
    }

    if (updates.status !== undefined) {
      if (updates.status === "all") {
        nextParams.delete("status");
      } else {
        nextParams.set("status", updates.status);
      }
    }

    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Cadastros"
        title="Produtos"
        subtitle={headerSubtitle}
        action={
          <Link to="/products/new">
            <Button>Novo produto</Button>
          </Link>
        }
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Busca">
            <Input
              value={search}
              onChange={(event) => {
                updateFilters({ search: event.target.value });
              }}
              placeholder="SKU, nome ou marca"
              autoComplete="off"
            />
          </Field>

          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => {
                updateFilters({ status: event.target.value as "all" | "active" | "inactive" });
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </Select>
          </Field>
        </div>
        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="border border-[var(--jam-border)]"
              onClick={() => {
                setPage(1);
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : null}
      </Card>

      {productsQuery.isPending ? (
        <ListSkeleton rows={4} />
      ) : null}

      {productsQuery.isError ? (
        <RetryableErrorState
          title="Falha ao carregar produtos"
          message="Confira a conexão com o backend e tente novamente."
          onRetry={() => void productsQuery.refetch()}
        />
      ) : null}

      {!productsQuery.isPending &&
      !productsQuery.isError &&
      productsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhum produto encontrado"
          message={hasActiveFilters ? "Nenhum produto combina com os filtros atuais." : "Comece cadastrando os itens principais do consignado."}
          action={
            <Link to="/products/new">
              <Button>Criar primeiro produto</Button>
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-3 lg:hidden sm:grid-cols-2">
        {paginatedProducts.pageItems.map((product) => (
          <Card key={product.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">
                  {product.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">
                  {product.sku}
                </p>
              </div>
              <StatusBadge active={product.isActive} />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--jam-subtle)]">
                  {product.brand ?? "Sem marca"} ·{" "}
                  {product.category ?? "Sem categoria"}
                </p>
                <div className="mt-2 grid gap-1">
                  <p className="text-sm font-semibold text-[var(--jam-ink)]">
                    Preço base: {formatCurrency(Number(product.basePrice))}
                  </p>
                  <p className="text-sm text-[var(--jam-subtle)]">
                    Custo de compra:{" "}
                    {product.costPrice === null
                      ? "Sem custo de compra cadastrado"
                      : formatCurrency(Number(product.costPrice))}
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

      {paginatedProducts.pageItems.length > 0 ? (
        <Card className="hidden overflow-hidden p-0 lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço base</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--jam-border)]">
              {paginatedProducts.pageItems.map((product) => (
                <tr key={product.id} className="transition hover:bg-[rgba(29,78,216,0.04)]">
                  <td className="px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{product.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--jam-subtle)]">{product.brand ?? "Sem marca"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{product.category ?? "Sem categoria"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(Number(product.basePrice))}</td>
                  <td className="px-4 py-3"><StatusBadge active={product.isActive} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/products/${product.id}/edit`}>
                      <Button variant="secondary">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <PaginationControls
        page={paginatedProducts.page}
        totalPages={paginatedProducts.totalPages}
        totalItems={productsQuery.data?.length ?? 0}
        pageSize={PRODUCTS_PAGE_SIZE}
        itemLabel="produtos"
        onPageChange={setPage}
      />
    </div>
  );
}

function normalizeStatusFilter(value: string | null): "all" | "active" | "inactive" {
  return value === "active" || value === "inactive" ? value : "all";
}
