import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button, Card, EmptyState, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { getClient } from "../clients/clients-api";
import { cancelVisit, deleteVisitItem, getVisit } from "./visits-api";
import { visitStatusLabel, visitStatusTone } from "./visit-utils";

export function VisitDetailPage() {
  const { visitId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisit(visitId)
  });
  const clientQuery = useQuery({
    queryKey: ["client", visitQuery.data?.clientId],
    queryFn: () => getClient(visitQuery.data!.clientId),
    enabled: Boolean(visitQuery.data?.clientId)
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVisit(visitId),
    onSuccess: async (visit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", visit.id], visit);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => deleteVisitItem(visitId, itemId),
    onSuccess: async (visit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", visit.id], visit);
    }
  });

  const clientName = useMemo(() => clientQuery.data?.tradeName ?? "Cliente", [clientQuery.data]);

  if (visitQuery.isPending || clientQuery.isPending) {
    return <PageLoader label="Carregando visita..." />;
  }

  if (visitQuery.isError || !visitQuery.data || clientQuery.isError) {
    return <EmptyState title="Visita nao encontrada" message="Volte para a lista de visitas e tente novamente." />;
  }

  const visit = visitQuery.data;
  const isDraft = visit.status === "DRAFT";

  return (
    <div className="space-y-4">
      <PageHeader
        title={clientName}
        subtitle={visit.visitCode}
        action={<ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />}
      />

      <Card className="space-y-4 bg-[linear-gradient(145deg,#2f1b0d_0%,#8a4316_100%)] text-white">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Total da visita</p>
            <p className="mt-2 font-display text-3xl font-bold">{formatCurrency(visit.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Recebido no local</p>
            <p className="mt-2 font-display text-3xl font-bold">{formatCurrency(visit.receivedAmountOnVisit)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-amber-50/90">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Visitada em</p>
            <p className="mt-1 font-semibold">{formatDate(visit.visitedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Vencimento</p>
            <p className="mt-1 font-semibold">{formatDate(visit.dueDate)}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Metadados do draft</p>
        <p className="text-sm text-[var(--jam-subtle)]">{visit.notes || "Sem observacoes registradas."}</p>
        {isDraft ? (
          <Link to={`/visits/${visit.id}/edit`}>
            <Button variant="secondary" className="w-full">
              Editar metadados
            </Button>
          </Link>
        ) : null}
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-bold">Itens da visita</p>
          <p className="text-sm text-[var(--jam-subtle)]">{visit.items.length} item(ns) no draft</p>
        </div>
        {isDraft ? (
          <Link to={`/visits/${visit.id}/items/new`}>
            <Button>Novo item</Button>
          </Link>
        ) : null}
      </div>

      {visit.items.length === 0 ? (
        <EmptyState
          title="Nenhum item ainda"
          message="Adicione os produtos conferidos no cliente para calcular o total da visita."
          action={
            isDraft ? (
              <Link to={`/visits/${visit.id}/items/new`}>
                <Button>Adicionar primeiro item</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      <div className="space-y-3">
        {visit.items.map((item) => (
          <Card key={item.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{item.productSnapshotName}</p>
                <p className="text-sm text-[var(--jam-subtle)]">{item.productSnapshotSku}</p>
              </div>
              <div className="rounded-2xl bg-[rgba(190,93,25,0.1)] px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Subtotal</p>
                <p className="text-base font-bold text-[var(--jam-ink)]">{formatCurrency(item.subtotalAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Anterior" value={item.quantityPrevious} />
              <Metric label="Boa restante" value={item.quantityGoodRemaining} />
              <Metric label="Defeito" value={item.quantityDefectiveReturn} />
              <Metric label="Perda" value={item.quantityLoss} />
              <Metric label="Vendida" value={item.quantitySold} highlight />
              <Metric label="Reposicao" value={item.restockedQuantity} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Preco unitario" value={formatCurrency(item.unitPrice)} />
              <Metric label="Saldo final" value={item.resultingClientQuantity} />
            </div>

            {item.notes ? <p className="text-sm text-[var(--jam-subtle)]">{item.notes}</p> : null}

            {isDraft ? (
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/visits/${visit.id}/items/${item.id}/edit`}>
                  <Button variant="secondary" className="w-full">
                    Editar item
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={deleteItemMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Remover este item da visita draft?")) {
                      void deleteItemMutation.mutateAsync({ itemId: item.id });
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      {isDraft ? (
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Acoes do draft</p>
          <div className="grid gap-3">
            <Button
              variant="danger"
              className="w-full"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (window.confirm("Cancelar esta visita draft?")) {
                  void cancelMutation.mutateAsync().then(() => navigate("/visits", { replace: true }));
                }
              }}
            >
              Cancelar visita
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl bg-[rgba(245,158,11,0.16)] p-3" : "rounded-2xl bg-white/80 p-3"}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
