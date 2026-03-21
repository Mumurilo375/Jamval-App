import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import {
  Button,
  Card,
  DrawerPanel,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  PageLoader,
  Select,
  Textarea,
  ToneBadge
} from "../../components/ui";
import { cx } from "../../lib/cx";
import { toOptionalString } from "../../lib/forms";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import type { PaymentMethod, ReceivableDetail } from "../../types/domain";
import { listClients } from "../clients/clients-api";
import { parseDecimalInput } from "../visits/visit-utils";
import { createReceivablePayment, getReceivable, listReceivables } from "./finance-api";
import {
  financeViewOptions,
  groupClientsByOutstanding,
  matchesFinanceView,
  paymentMethodLabel,
  receivableStatusLabel,
  receivableStatusTone,
  sortReceivables,
  summarizeReceivables,
  type FinanceView
} from "./finance-utils";

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartao" },
  { value: "BANK_TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Outro" }
];

const paymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor recebido")
    .refine((value) => !Number.isNaN(parseDecimalInput(value)) && parseDecimalInput(value) > 0, "Informe um valor valido"),
  paymentMethod: z
    .string()
    .trim()
    .min(1, "Selecione a forma de pagamento")
    .refine((value) => paymentMethodOptions.some((option) => option.value === value), "Selecione a forma de pagamento"),
  reference: z.string(),
  notes: z.string()
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdFromQuery = searchParams.get("clientId") ?? "";
  const visitIdFromQuery = searchParams.get("visitId") ?? "";

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromQuery);
  const [view, setView] = useState<FinanceView>("OPEN");
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", "finance-filter"],
    queryFn: () => listClients({ isActive: true })
  });
  const receivablesQuery = useQuery({
    queryKey: ["finance", "receivables", selectedClientId || "all"],
    queryFn: () => listReceivables({ clientId: selectedClientId || undefined })
  });
  const sortedReceivables = useMemo(
    () => sortReceivables(receivablesQuery.data ?? []),
    [receivablesQuery.data]
  );
  const visibleReceivables = useMemo(
    () => sortedReceivables.filter((receivable) => matchesFinanceView(receivable, view)),
    [sortedReceivables, view]
  );
  const activeReceivableId = useMemo(
    () =>
      selectedReceivableId && visibleReceivables.some((receivable) => receivable.id === selectedReceivableId)
        ? selectedReceivableId
        : null,
    [selectedReceivableId, visibleReceivables]
  );
  const receivableDetailQuery = useQuery({
    queryKey: ["finance", "receivable", activeReceivableId],
    queryFn: () => getReceivable(activeReceivableId!),
    enabled: Boolean(activeReceivableId)
  });
  const summary = useMemo(
    () => summarizeReceivables(receivablesQuery.data ?? []),
    [receivablesQuery.data]
  );
  const topClients = useMemo(
    () => groupClientsByOutstanding(receivablesQuery.data ?? [], 3),
    [receivablesQuery.data]
  );

  useEffect(() => {
    setSelectedClientId(clientIdFromQuery);
  }, [clientIdFromQuery]);

  useEffect(() => {
    if (!visitIdFromQuery || receivablesQuery.isPending) {
      return;
    }

    const matchingReceivable = (receivablesQuery.data ?? []).find((receivable) => receivable.visitId === visitIdFromQuery);

    if (matchingReceivable) {
      setView("OPEN");
      setSelectedReceivableId(matchingReceivable.id);
    }

    updateFinanceSearchParams(searchParams, setSearchParams, {
      visitId: ""
    });
  }, [receivablesQuery.data, receivablesQuery.isPending, searchParams, setSearchParams, visitIdFromQuery]);

  if (receivablesQuery.isPending) {
    return <PageLoader label="Carregando financeiro..." />;
  }

  if (receivablesQuery.isError) {
    return (
      <EmptyState
        title="Nao foi possivel carregar o financeiro"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Receber"
        subtitle="Titulos em aberto, cobrancas do dia e recebimentos ja registrados."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricCard label="Titulos em aberto" value={String(summary.openCount)} />
        <FinanceMetricCard label="Titulos parciais" value={String(summary.partialCount)} tone="warning" />
        <FinanceMetricCard label="Valor pendente total" value={formatCurrency(summary.totalPendingAmount)} />
        <FinanceMetricCard label="Valor recebido" value={formatCurrency(summary.totalReceivedAmount)} tone="success" />
      </div>

      <Card className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_1fr]">
          <Field label="Cliente">
            <Select
              value={selectedClientId}
              onChange={(event) => {
                const nextClientId = event.target.value;

                setSelectedClientId(nextClientId);
                setSelectedReceivableId(null);
                updateFinanceSearchParams(searchParams, setSearchParams, {
                  clientId: nextClientId,
                  visitId: ""
                });
              }}
            >
              <option value="">Todos os clientes</option>
              {clientsQuery.data?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.tradeName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-[var(--jam-ink)] sm:text-sm">Visao da carteira</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {financeViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setView(option.value)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition sm:text-[12px]",
                    view === option.value
                      ? "border-[var(--jam-accent)] bg-[var(--jam-accent)] text-white"
                      : "border-[var(--jam-border)] bg-white text-[var(--jam-subtle)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_320px]">
        <div className="space-y-3">
          {visibleReceivables.length === 0 ? (
            <EmptyState
              title="Nenhum titulo encontrado"
              message="Nao ha titulos para os filtros atuais."
            />
          ) : (
            visibleReceivables.map((receivable) => (
              <button
                key={receivable.id}
                type="button"
                onClick={() => setSelectedReceivableId(receivable.id)}
                className="block w-full text-left"
              >
                <Card
                  className={cx(
                    "space-y-3 transition",
                    activeReceivableId === receivable.id
                      ? "border-[rgba(29,78,216,0.24)] bg-[rgba(29,78,216,0.04)]"
                      : "hover:border-[rgba(29,78,216,0.18)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)] sm:text-base">
                        {receivable.client.tradeName}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">
                        {receivable.visit.visitCode} · visita em {formatDate(receivable.visit.visitedAt)}
                      </p>
                    </div>
                    <ToneBadge
                      label={receivableStatusLabel(receivable.status)}
                      tone={receivableStatusTone(receivable.status)}
                    />
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-4">
                    <FinanceItemMetric label="Valor original" value={formatCurrency(receivable.originalAmount)} />
                    <FinanceItemMetric label="Recebido" value={formatCurrency(receivable.amountReceived)} />
                    <FinanceItemMetric label="Saldo" value={formatCurrency(receivable.amountOutstanding)} />
                    <FinanceItemMetric label="Lancado em" value={formatDate(receivable.issuedAt)} />
                  </div>
                </Card>
              </button>
            ))
          )}
        </div>

        <Card className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Leitura rapida</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <FinanceInfoRow
              label="Clientes com maior pendencia"
              value={String(topClients.length)}
              hint="Clientes com valor em aberto no recorte atual."
            />
            <FinanceInfoRow
              label="Titulos visiveis"
              value={String(visibleReceivables.length)}
              hint="Quantidade de titulos na visao selecionada."
            />
          </div>

          <div className="space-y-2">
            {topClients.length === 0 ? (
              <p className="text-sm text-[var(--jam-subtle)]">Nenhum cliente com pendencia no recorte atual.</p>
            ) : (
              topClients.map((client) => (
                <div key={client.clientId} className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{client.tradeName}</p>
                      <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">
                        {client.receivableCount} titulo(s) em aberto
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--jam-ink)]">
                      {formatCurrency(client.outstandingAmount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <DrawerPanel
        open={Boolean(activeReceivableId)}
        onClose={() => setSelectedReceivableId(null)}
        title={receivableDetailQuery.data ? receivableDetailQuery.data.client.tradeName : "Detalhe do titulo"}
        description={
          receivableDetailQuery.data
            ? `${receivableDetailQuery.data.visit.visitCode} · visita em ${formatDate(receivableDetailQuery.data.visit.visitedAt)}`
            : "Carregando detalhes do titulo"
        }
      >
        {receivableDetailQuery.isPending ? (
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-4 py-4 text-sm text-[var(--jam-subtle)]">
            Carregando detalhes...
          </div>
        ) : receivableDetailQuery.isError || !receivableDetailQuery.data ? (
          <ErrorBanner message="Nao foi possivel carregar o detalhe deste titulo." />
        ) : (
          <FinanceDetailContent receivable={receivableDetailQuery.data} />
        )}

        {receivableDetailQuery.data ? <ReceivablePaymentForm receivable={receivableDetailQuery.data} /> : null}
      </DrawerPanel>
    </div>
  );
}

function FinanceDetailContent({ receivable }: { receivable: ReceivableDetail }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <FinanceItemMetric label="Valor original" value={formatCurrency(receivable.originalAmount)} />
        <FinanceItemMetric label="Recebido" value={formatCurrency(receivable.amountReceived)} />
        <FinanceItemMetric label="Saldo em aberto" value={formatCurrency(receivable.amountOutstanding)} />
      </div>

      <Card className="space-y-3 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Contexto da visita</p>
        <div className="space-y-2 text-sm text-[var(--jam-subtle)]">
          <p>
            <span className="font-medium text-[var(--jam-ink)]">Visita:</span> {receivable.visit.visitCode}
          </p>
          <p>
            <span className="font-medium text-[var(--jam-ink)]">Data da visita:</span> {formatDate(receivable.visit.visitedAt)}
          </p>
          <p>
            <span className="font-medium text-[var(--jam-ink)]">Status:</span> {receivableStatusLabel(receivable.status)}
          </p>
          <p>
            <span className="font-medium text-[var(--jam-ink)]">Total da visita:</span> {formatCurrency(receivable.visit.totalAmount)}
          </p>
        </div>
      </Card>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Historico de pagamentos</p>
        {receivable.payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3 text-sm text-[var(--jam-subtle)]">
            Nenhum pagamento posterior registrado para este titulo.
          </div>
        ) : (
          receivable.payments.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--jam-ink)]">{paymentMethodLabel(payment.paymentMethod)}</p>
                  <p className="mt-0.5 text-sm text-[var(--jam-subtle)]">{formatDateTime(payment.paidAt)}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(payment.amount)}</p>
              </div>

              {payment.reference ? (
                <p className="mt-2 text-sm text-[var(--jam-subtle)]">Referencia: {payment.reference}</p>
              ) : null}
              {payment.notes ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{payment.notes}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReceivablePaymentForm({ receivable }: { receivable: ReceivableDetail }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "",
      reference: "",
      notes: ""
    }
  });

  useEffect(() => {
    reset({
      amount: "",
      paymentMethod: "",
      reference: "",
      notes: ""
    });
  }, [receivable.id, receivable.amountOutstanding, reset]);

  const mutation = useMutation({
    mutationFn: async (values: PaymentFormValues) =>
      createReceivablePayment(receivable.id, {
        amount: parseDecimalInput(values.amount),
        paymentMethod: values.paymentMethod as PaymentMethod,
        reference: toOptionalString(values.reference),
        notes: toOptionalString(values.notes)
      }),
    onSuccess: async (result) => {
      reset({
        amount: "",
        paymentMethod: "",
        reference: "",
        notes: ""
      });
      queryClient.setQueryData(["finance", "receivable", receivable.id], result.receivable);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance", "receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["operation-home"] }),
        queryClient.invalidateQueries({ queryKey: ["admin"] })
      ]);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  if (receivable.status === "PAID") {
    return (
      <Card className="mt-4 space-y-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Pagamento</p>
        <p className="text-sm text-[var(--jam-subtle)]">Este titulo ja esta quitado. Nao ha saldo para novo lancamento.</p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 space-y-4 p-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Registrar pagamento</p>
        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
          Registre apenas o valor recebido agora. O backend bloqueia lancamentos acima do saldo em aberto.
        </p>
      </div>

      {mutation.error instanceof Error ? <ErrorBanner message={mutation.error.message} /> : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Valor recebido" error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="0,00" {...register("amount")} />
        </Field>

        <Field label="Forma de pagamento" error={errors.paymentMethod?.message}>
          <Select {...register("paymentMethod")}>
            <option value="">Selecione</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Referencia" hint="Opcional">
          <Input placeholder="PIX, comprovante ou observacao curta" {...register("reference")} />
        </Field>

        <Field label="Observacoes" hint="Opcional">
          <Textarea rows={3} placeholder="Detalhes do recebimento" {...register("notes")} />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Registrar pagamento"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FinanceMetricCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
        {tone !== "neutral" ? (
          <ToneBadge label={tone === "warning" ? "Atencao" : "Ok"} tone={tone} />
        ) : null}
      </div>
      <p className="font-display text-[1.1rem] font-semibold text-[var(--jam-ink)] sm:text-[1.45rem]">{value}</p>
    </Card>
  );
}

function FinanceItemMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function FinanceInfoRow({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--jam-subtle)]">{hint}</p>
    </div>
  );
}

function updateFinanceSearchParams(
  currentParams: URLSearchParams,
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void,
  updates: Record<string, string>
) {
  const nextParams = new URLSearchParams(currentParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  });

  setSearchParams(nextParams, { replace: true });
}
