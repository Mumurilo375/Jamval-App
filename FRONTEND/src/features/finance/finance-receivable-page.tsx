import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, PageLoader, Select, Textarea, ToneBadge } from "../../components/ui";
import { toOptionalString } from "../../lib/forms";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import type { PaymentMethod, ReceivableDetail } from "../../types/domain";
import { parseDecimalInput } from "../visits/visit-utils";
import { createReceivablePayment, getReceivable } from "./finance-api";
import {
  normalizeFinanceQueueStatus,
  paymentMethodLabel,
  receivableOriginLabel,
  receivableStatusLabel,
  receivableStatusTone
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

export function FinanceReceivablePage() {
  const { receivableId } = useParams();
  const [searchParams] = useSearchParams();
  const returnStatus = normalizeFinanceQueueStatus(searchParams.get("status"));

  const receivableQuery = useQuery({
    queryKey: ["finance", "receivable", receivableId],
    queryFn: () => getReceivable(receivableId!),
    enabled: Boolean(receivableId)
  });

  if (!receivableId) {
    return (
      <EmptyState
        title="Titulo nao encontrado"
        message="Abra o financeiro novamente e selecione um titulo valido."
        action={
          <Link to={`/financeiro?status=${returnStatus}`}>
            <Button variant="secondary">Voltar para a fila</Button>
          </Link>
        }
      />
    );
  }

  if (receivableQuery.isPending) {
    return <PageLoader label="Carregando recebimento..." />;
  }

  if (receivableQuery.isError || !receivableQuery.data) {
    return (
      <EmptyState
        title="Nao foi possivel carregar este titulo"
        message="Volte para a fila e tente abrir o recebimento novamente."
        action={
          <Link to={`/financeiro?status=${returnStatus}`}>
            <Button variant="secondary">Voltar para a fila</Button>
          </Link>
        }
      />
    );
  }

  const receivable = receivableQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Financeiro"
        title={receivable.client.tradeName}
        subtitle={`${receivableOriginLabel(receivable.visit.visitType)} • ${formatDate(receivable.visit.visitedAt)}`}
        action={
          <Link to={`/financeiro?status=${returnStatus}`}>
            <Button variant="secondary" className="w-full sm:w-auto">
              Voltar para a fila
            </Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--jam-ink)]">{receivableOriginLabel(receivable.visit.visitType)}</p>
            <p className="mt-1 text-sm text-[var(--jam-subtle)]">
              {receivable.visit.visitCode} • {formatDate(receivable.visit.visitedAt)}
            </p>
          </div>
          <ToneBadge
            label={receivableStatusLabel(receivable.status)}
            tone={receivableStatusTone(receivable.status)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SummaryMetric label="Total" value={formatCurrency(receivable.originalAmount)} />
          <SummaryMetric label="Recebido" value={formatCurrency(receivable.amountReceived)} />
          <SummaryMetric label="Saldo atual" value={formatCurrency(receivable.amountOutstanding)} />
        </div>
      </Card>

      <ReceivablePaymentCard receivable={receivable} />

      <details className="rounded-xl border border-[var(--jam-border)] bg-white px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--jam-ink)]">
          Historico de pagamentos
        </summary>
        <div className="mt-3 space-y-2">
          {receivable.payments.length === 0 ? (
            <p className="text-sm text-[var(--jam-subtle)]">Nenhum recebimento registrado ate agora.</p>
          ) : (
            receivable.payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--jam-ink)]">
                      {paymentMethodLabel(payment.paymentMethod)}
                    </p>
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
      </details>
    </div>
  );
}

function ReceivablePaymentCard({ receivable }: { receivable: ReceivableDetail }) {
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
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-[var(--jam-ink)]">Titulo quitado</p>
        <p className="text-sm text-[var(--jam-subtle)]">
          Este titulo ja foi encerrado e nao precisa de novo recebimento.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--jam-ink)]">Registrar recebimento</p>
        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
          Informe apenas o valor recebido agora. O saldo atualiza automaticamente.
        </p>
      </div>

      {mutation.error instanceof Error ? <ErrorBanner message={mutation.error.message} /> : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Saldo atual">
            <Input value={formatCurrency(receivable.amountOutstanding)} readOnly />
          </Field>

          <Field label="Valor recebido" error={errors.amount?.message}>
            <Input inputMode="decimal" placeholder="0,00" {...register("amount")} />
          </Field>
        </div>

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
            {mutation.isPending ? "Salvando..." : "Registrar recebimento"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--jam-panel-strong)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
