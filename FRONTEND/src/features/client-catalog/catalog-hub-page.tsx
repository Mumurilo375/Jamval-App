import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, Field, Input, PageHeader, PageLoader, StatusBadge } from "../../components/ui";
import { listClients } from "../clients/clients-api";

export function CatalogHubPage() {
  const [search, setSearch] = useState("");
  const clientsQuery = useQuery({
    queryKey: ["catalog-hub", "clients"],
    queryFn: () => listClients({})
  });
  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return (clientsQuery.data ?? []).filter((client) => {
      if (!term) {
        return true;
      }

      return `${client.tradeName} ${client.contactName ?? ""} ${client.phone ?? ""}`
        .toLocaleLowerCase()
        .includes(term);
    });
  }, [clientsQuery.data, search]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Cadastros"
        title="Catalogo por cliente"
        subtitle="Acesse o mix configurado de cada cliente sem confundir isso com o estoque fisico atual da loja."
      />

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-sm font-semibold text-[var(--jam-ink)]">O que esta area mostra</p>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">
              Produtos habilitados para o cliente, com preco configurado, quantidade ideal, ordem e se entram nas proximas visitas.
            </p>
          </div>

          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-sm font-semibold text-[var(--jam-ink)]">O que esta area nao mostra</p>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">
              O estoque fisico atual da loja. Esse saldo real depende do historico das visitas e da ultima conferencia feita no cliente.
            </p>
          </div>
        </div>

        <Field label="Buscar cliente">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, contato ou telefone"
          />
        </Field>
      </Card>

      {clientsQuery.isPending ? <PageLoader label="Carregando clientes..." /> : null}

      {clientsQuery.isError ? (
        <EmptyState title="Nao foi possivel carregar o catalogo" message="Confira a conexao com o backend e tente novamente." />
      ) : null}

      {!clientsQuery.isPending && !clientsQuery.isError && filteredClients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          message="Ajuste a busca ou cadastre clientes para organizar o catalogo por loja."
        />
      ) : null}

      <div className="space-y-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--jam-ink)]">{client.tradeName}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">
                  {client.contactName ?? client.phone ?? "Sem contato principal"}
                </p>
              </div>
              <StatusBadge active={client.isActive} />
            </div>

            <p className="text-sm text-[var(--jam-subtle)]">
              Entre para revisar preco atual, ordem e os produtos que aparecem nas proximas visitas.
            </p>

            <Link to={`/clients/${client.id}/catalog`}>
              <Button className="w-full justify-between">
                <span>Abrir catalogo do cliente</span>
                <span>→</span>
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
