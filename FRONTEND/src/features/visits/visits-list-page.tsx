import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button, EmptyState, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { cx } from "../../lib/cx";
import { formatDate } from "../../lib/format";
import type { ReceivableListItem, Visit, VisitDetail, VisitType } from "../../types/domain";
import { listClients } from "../clients/clients-api";
import { listReceivables } from "../finance/finance-api";
import { buildReceivableRoute } from "../finance/finance-utils";
import { getVisit, listVisits } from "./visits-api";
import { visitStatusLabel, visitStatusTone, visitTypeLabel } from "./visit-utils";

const statusOptions = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "COMPLETED", label: "Concluida" },
  { value: "CANCELLED", label: "Cancelada" }
] as const;

const visitTypeOptions = [
  { value: "", label: "Todas" },
  { value: "CONSIGNMENT", label: "Consignacao" },
  { value: "SALE", label: "Venda" }
] as const;

export function VisitsListPage() {
  const [status, setStatus] = useState<"DRAFT" | "COMPLETED" | "CANCELLED">("DRAFT");
  const [visitType, setVisitType] = useState<"" | VisitType>("");

  const filters = useMemo(
    () => ({
      status,
      visitType: visitType || undefined
    }),
    [status, visitType]
  );

  const visitsQuery = useQuery({
    queryKey: ["visits", "queue", filters],
    queryFn: () => listVisits(filters)
  });
  const clientsQuery = useQuery({
    queryKey: ["clients", "visits-map"],
    queryFn: () => listClients({})
  });
  const receivablesQuery = useQuery({
    queryKey: ["finance", "receivables", "visits-queue"],
    queryFn: () => listReceivables(),
    enabled: Boolean(visitsQuery.data?.some((visit) => visit.status === "COMPLETED"))
  });

  const visitDetailQueries = useQueries({
    queries: (visitsQuery.data ?? []).map((visit) => ({
      queryKey: ["visit", visit.id, "queue"],
      queryFn: () => getVisit(visit.id),
      enabled: visit.status === "DRAFT"
    }))
  });

  const clientMap = useMemo(
    () => new Map((clientsQuery.data ?? []).map((client) => [client.id, client.tradeName])),
    [clientsQuery.data]
  );
  const visitDetailById = useMemo(() => {
    const map = new Map<string, VisitDetail>();

    (visitsQuery.data ?? []).forEach((visit, index) => {
      const detail = visitDetailQueries[index]?.data;

      if (detail) {
        map.set(visit.id, detail);
      }
    });

    return map;
  }, [visitDetailQueries, visitsQuery.data]);
  const visitDetailStateById = useMemo(() => {
    const map = new Map<string, { isPending: boolean; isError: boolean }>();

    (visitsQuery.data ?? []).forEach((visit, index) => {
      const result = visitDetailQueries[index];

      map.set(visit.id, {
        isPending: result?.isPending ?? false,
        isError: result?.isError ?? false
      });
    });

    return map;
  }, [visitDetailQueries, visitsQuery.data]);
  const receivableByVisitId = useMemo(
    () => new Map((receivablesQuery.data ?? []).map((receivable) => [receivable.visitId, receivable])),
    [receivablesQuery.data]
  );

  if (visitsQuery.isPending || clientsQuery.isPending) {
    return <PageLoader label="Carregando fila de visitas..." />;
  }

  if (visitsQuery.isError || clientsQuery.isError) {
    return (
      <EmptyState
        title="Falha ao carregar visitas"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const visits = visitsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Fila de visitas"
        subtitle="Abra o rascunho certo, confira a visita e siga para o proximo passo sem perder tempo."
        action={
          <Link to="/visits/new">
            <Button>Nova visita</Button>
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <FilterGroup
          label="Status"
          options={statusOptions}
          selectedValue={status}
          onSelect={setStatus}
        />
        <FilterGroup
          label="Tipo"
          options={visitTypeOptions}
          selectedValue={visitType}
          onSelect={(value) => setVisitType(value as "" | VisitType)}
        />
      </div>

      {visits.length === 0 ? (
        <EmptyState
          title="Nenhuma visita encontrada"
          message={
            status === "DRAFT"
              ? "Nao ha rascunhos para os filtros atuais. Abra uma nova visita para comecar a fila."
              : "Nao ha visitas para os filtros atuais."
          }
          action={
            status === "DRAFT" ? (
              <Link to="/visits/new">
                <Button>Criar visita</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {visits.map((visit) => {
            const detailState = visitDetailStateById.get(visit.id) ?? { isPending: false, isError: false };
            const nextStep = resolveVisitQueueAction({
              visit,
              detail: visitDetailById.get(visit.id),
              detailState,
              receivable: receivableByVisitId.get(visit.id),
              isReceivablesPending: receivablesQuery.isPending,
              isReceivablesError: receivablesQuery.isError
            });

            return (
              <article
                key={visit.id}
                className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                        {clientMap.get(visit.clientId) ?? "Cliente"}
                      </p>
                      <p className="mt-1 truncate text-sm text-[var(--jam-subtle)]">
                        {visit.visitCode} · {formatDate(visit.visitedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <VisitTypeBadge visitType={visit.visitType} />
                      <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 border-t border-[var(--jam-border)] pt-3 sm:w-auto sm:min-w-[220px] sm:border-t-0 sm:pt-0 sm:text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Proximo passo</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{nextStep.label}</p>
                    </div>

                    {nextStep.disabled ? (
                      <Button className="w-full sm:min-w-[160px]" disabled>
                        {nextStep.label}
                      </Button>
                    ) : (
                      <Link to={nextStep.href} className="w-full sm:w-auto">
                        <Button variant={nextStep.variant} className="w-full sm:min-w-[160px]">
                          {nextStep.label}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  selectedValue,
  onSelect
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value || option.label}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cx(
              "rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
              selectedValue === option.value
                ? "border-[var(--jam-accent)] bg-[var(--jam-accent)] text-white"
                : "border-[var(--jam-border)] bg-white text-[var(--jam-subtle)]"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VisitTypeBadge({ visitType }: { visitType: VisitType }) {
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        visitType === "SALE"
          ? "bg-[rgba(15,118,110,0.1)] text-[var(--jam-success)]"
          : "bg-[rgba(29,78,216,0.08)] text-[var(--jam-accent)]"
      )}
    >
      {visitTypeLabel(visitType)}
    </span>
  );
}

function resolveVisitQueueAction({
  visit,
  detail,
  detailState,
  receivable,
  isReceivablesPending,
  isReceivablesError
}: {
  visit: Visit;
  detail?: VisitDetail;
  detailState: { isPending: boolean; isError: boolean };
  receivable?: ReceivableListItem;
  isReceivablesPending: boolean;
  isReceivablesError: boolean;
}) {
  if (visit.status === "CANCELLED") {
    return {
      label: "Ver visita",
      href: `/visits/${visit.id}`,
      variant: "secondary" as const
    };
  }

  if (visit.status === "COMPLETED") {
    if (isReceivablesPending) {
      return {
        label: "Carregando...",
        href: `/visits/${visit.id}`,
        variant: "secondary" as const,
        disabled: true
      };
    }

    if (!isReceivablesError && receivable && (receivable.status === "PENDING" || receivable.status === "PARTIAL" || receivable.isOverdue)) {
      return {
        label: "Receber",
        href: buildReceivableRoute(receivable.id, receivable.status),
        variant: "primary" as const
      };
    }

    return {
      label: "Ver comprovante",
      href: `/visits/${visit.id}`,
      variant: "secondary" as const
    };
  }

  if (detailState.isPending) {
    return {
      label: "Carregando...",
      href: `/visits/${visit.id}`,
      variant: "secondary" as const,
      disabled: true
    };
  }

  if (detailState.isError || !detail) {
    return {
      label: "Ver visita",
      href: `/visits/${visit.id}`,
      variant: "secondary" as const
    };
  }

  if (detail.items.length === 0) {
    return {
      label: "Adicionar itens",
      href: `/visits/${visit.id}`,
      variant: "primary" as const
    };
  }

  if (visit.visitType === "SALE") {
    return {
      label: "Conferir venda",
      href: `/visits/${visit.id}`,
      variant: "primary" as const
    };
  }

  if (detail.items.some((item) => item.suggestedRestockQuantity > 0 || item.restockedQuantity > 0)) {
    return {
      label: "Repor",
      href: `/visits/${visit.id}`,
      variant: "primary" as const
    };
  }

  return {
    label: "Concluir",
    href: `/visits/${visit.id}`,
    variant: "primary" as const
  };
}
