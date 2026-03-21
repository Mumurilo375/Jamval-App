import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, PageHeader, PageLoader, Select, StatusBadge } from "../../components/ui";
import { listClients } from "./clients-api";

export function ClientsListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      isActive: status === "all" ? undefined : status === "active"
    }),
    [search, status]
  );

  const clientsQuery = useQuery({
    queryKey: ["clients", filters],
    queryFn: () => listClients(filters)
  });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        subtitle="Pontos de venda, contato e acesso ao mix e preco de cada cliente."
        action={
          <Link to="/clients/new">
            <Button>Novo</Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <Field label="Busca">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, documento ou contato" />
        </Field>

        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </Select>
        </Field>
      </Card>

      {clientsQuery.isPending ? <PageLoader label="Carregando clientes..." /> : null}

      {clientsQuery.isError ? (
        <EmptyState title="Falha ao carregar clientes" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!clientsQuery.isPending && !clientsQuery.isError && clientsQuery.data?.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          message="Cadastre o primeiro ponto de consignado para iniciar a operacao."
          action={
            <Link to="/clients/new">
              <Button>Criar primeiro cliente</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {clientsQuery.data?.map((client) => (
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
    </div>
  );
}
