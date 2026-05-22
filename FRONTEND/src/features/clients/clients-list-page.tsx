import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, ListSkeleton, PageHeader, PaginationControls, RetryableErrorState, Select, StatusBadge } from "../../components/ui";
import { formatCount } from "../../lib/format";
import { paginateItems } from "../../lib/pagination";
import { listClients } from "./clients-api";

const CLIENTS_PAGE_SIZE = 6;

export function ClientsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const search = searchParams.get("search") ?? "";
  const status = normalizeStatusFilter(searchParams.get("status"));
  const deferredSearch = useDeferredValue(search);

  const filters = useMemo(
    () => ({
      search: deferredSearch.trim() || undefined,
      isActive: status === "all" ? undefined : status === "active"
    }),
    [deferredSearch, status]
  );

  const clientsQuery = useQuery({
    queryKey: ["clients", filters],
    queryFn: () => listClients(filters)
  });
  const paginatedClients = paginateItems(clientsQuery.data ?? [], page, CLIENTS_PAGE_SIZE);
  const headerSubtitle = clientsQuery.data
    ? `${formatCount(clientsQuery.data.length, "cliente")} no recorte atual`
    : "Clientes, contatos e mix por ponto de venda.";
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
        title="Clientes"
        subtitle={headerSubtitle}
        action={
          <Link to="/clients/new">
            <Button>Novo cliente</Button>
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
              placeholder="Nome, documento ou contato"
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

      {clientsQuery.isPending ? <ListSkeleton rows={4} /> : null}

      {clientsQuery.isError ? (
        <RetryableErrorState title="Falha ao carregar clientes" message="Confira a conexão com o backend e tente novamente." onRetry={() => void clientsQuery.refetch()} />
      ) : null}

      {!clientsQuery.isPending && !clientsQuery.isError && clientsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          message={hasActiveFilters ? "Nenhum cliente combina com os filtros atuais." : "Cadastre o primeiro ponto de consignado para iniciar a operação."}
          action={
            <Link to="/clients/new">
              <Button>Criar primeiro cliente</Button>
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-3 lg:hidden sm:grid-cols-2">
        {paginatedClients.pageItems.map((client) => (
          <Card key={client.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{client.tradeName}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{client.contactName ?? client.phone ?? "Sem contato principal"}</p>
              </div>
              <StatusBadge active={client.isActive} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--jam-subtle)]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Cidade</p>
                <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{client.addressCity ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">Ciclo</p>
                <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">
                  {client.visitCycleDays ? `${client.visitCycleDays} dias` : "-"}
                </p>
              </div>
            </div>

            <Link to={`/clients/${client.id}/edit`}>
              <Button className="w-full">Abrir cliente</Button>
            </Link>

          </Card>
        ))}
      </div>

      {paginatedClients.pageItems.length > 0 ? (
        <Card className="hidden overflow-hidden p-0 lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--jam-border)]">
              {paginatedClients.pageItems.map((client) => (
                <tr key={client.id} className="transition hover:bg-[rgba(29,78,216,0.04)]">
                  <td className="px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{client.tradeName}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--jam-subtle)]">{client.legalName ?? "Sem razão social"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{client.contactName ?? client.phone ?? "Sem contato"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{client.addressCity ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--jam-subtle)]">{client.visitCycleDays ? `${client.visitCycleDays} dias` : "-"}</td>
                  <td className="px-4 py-3"><StatusBadge active={client.isActive} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/clients/${client.id}/edit`}>
                      <Button variant="secondary">Abrir</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <PaginationControls
        page={paginatedClients.page}
        totalPages={paginatedClients.totalPages}
        totalItems={clientsQuery.data?.length ?? 0}
        pageSize={CLIENTS_PAGE_SIZE}
        itemLabel="clientes"
        onPageChange={setPage}
      />
    </div>
  );
}

function normalizeStatusFilter(value: string | null): "all" | "active" | "inactive" {
  return value === "active" || value === "inactive" ? value : "all";
}
