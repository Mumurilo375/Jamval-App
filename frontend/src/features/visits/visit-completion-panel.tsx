import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, Select, Textarea, ToneBadge } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { VisitDetail } from "../../types/domain";
import { completeVisit } from "./visits-api";
import { visitStatusLabel, visitStatusTone } from "./visit-utils";

const paymentMethods = ["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"] as const;

const completionFormSchema = z.object({
  paymentMethod: z.string().trim().min(1, "Selecione a forma de pagamento"),
  reference: z.string(),
  notes: z.string()
});

type CompletionFormValues = z.infer<typeof completionFormSchema>;

type VisitCompletionPanelProps = {
  visit: VisitDetail;
};

export function VisitCompletionPanel({ visit }: VisitCompletionPanelProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CompletionFormValues>({
    resolver: zodResolver(completionFormSchema),
    defaultValues: {
      paymentMethod: "",
      reference: "",
      notes: ""
    }
  });

  const implicitOutstanding = useMemo(
    () => Number((visit.totalAmount - visit.receivedAmountOnVisit).toFixed(2)),
    [visit.receivedAmountOnVisit, visit.totalAmount]
  );

  const completionMutation = useMutation({
    mutationFn: async (values?: CompletionFormValues) =>
      completeVisit(
        visit.id,
        values
          ? {
              paymentMethod: values.paymentMethod as (typeof paymentMethods)[number],
              reference: values.reference.trim() || undefined,
              notes: values.notes.trim() || undefined
            }
          : undefined
      ),
    onSuccess: async (completedVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", completedVisit.id], completedVisit);
      setIsFormOpen(false);
      reset();
    }
  });

  if (visit.status !== "DRAFT") {
    return (
      <Card className="space-y-3 border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-success)]">Conclusao</p>
            <p className="mt-1 font-display text-xl font-semibold text-[var(--jam-ink)]">Visita concluida</p>
          </div>
          <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">
          Concluida em {formatDate(visit.completedAt)}. As acoes operacionais foram escondidas para manter a visita somente leitura.
        </p>
      </Card>
    );
  }

  const mutationError = completionMutation.error instanceof ApiError ? completionMutation.error : null;
  const requiresInitialPayment = visit.receivedAmountOnVisit > 0;

  const onDirectComplete = async () => {
    if (!window.confirm("Concluir esta visita draft agora?")) {
      return;
    }

    await completionMutation.mutateAsync(undefined);
  };

  const onSubmit = handleSubmit(async (values) => {
    await completionMutation.mutateAsync(values);
  });

  return (
    <Card className="space-y-4 border-[rgba(29,78,216,0.14)] bg-[rgba(29,78,216,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-accent)]">Conclusao da visita</p>
          <p className="mt-1 font-display text-xl font-semibold text-[var(--jam-ink)]">Revisao final antes de concluir</p>
        </div>
        <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryMetric label="Total" value={formatCurrency(visit.totalAmount)} highlight />
        <SummaryMetric label="Recebido" value={formatCurrency(visit.receivedAmountOnVisit)} />
        <SummaryMetric label="Saldo" value={formatCurrency(implicitOutstanding)} />
      </div>

      {requiresInitialPayment ? (
        <p className="text-sm text-[var(--jam-subtle)]">
          Esta visita tem recebimento no ato. Para concluir, informe a forma do pagamento inicial.
        </p>
      ) : (
        <p className="text-sm text-[var(--jam-subtle)]">
          Como o recebido na visita esta zerado, voce pode concluir sem preencher pagamento inicial.
        </p>
      )}

      {mutationError ? <ErrorBanner message={formatCompletionError(mutationError, visit)} /> : null}

      {requiresInitialPayment && isFormOpen ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Forma de pagamento" error={errors.paymentMethod?.message}>
            <Select {...register("paymentMethod")}>
              <option value="">Selecione</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {formatPaymentMethod(method)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Referencia">
            <Input {...register("reference")} placeholder="pix nubank, maquina verde, dinheiro trocado" />
          </Field>

          <Field label="Observacoes">
            <Textarea {...register("notes")} placeholder="Observacoes sobre o pagamento inicial" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={completionMutation.isPending}>
              Fechar
            </Button>
            <Button type="submit" disabled={completionMutation.isPending}>
              {completionMutation.isPending ? "Concluindo..." : "Confirmar conclusao"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3">
          {requiresInitialPayment ? (
            <Button onClick={() => setIsFormOpen(true)} disabled={completionMutation.isPending}>
              Informar pagamento e concluir
            </Button>
          ) : (
            <Button onClick={() => void onDirectComplete()} disabled={completionMutation.isPending}>
              {completionMutation.isPending ? "Concluindo..." : "Concluir visita"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function SummaryMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl bg-[rgba(29,78,216,0.08)] p-3" : "rounded-xl bg-white p-3"}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function formatCompletionError(error: ApiError, visit: VisitDetail): string {
  if (error.code !== "INSUFFICIENT_CENTRAL_STOCK") {
    return error.message;
  }

  const rawItems = (error.details as { visitProducts?: Array<{ productId: string; requiredQuantity: number; availableQuantity: number }> } | null)
    ?.visitProducts;

  if (!rawItems || rawItems.length === 0) {
    return "Estoque central insuficiente para concluir a visita.";
  }

  const formattedItems = rawItems
    .map((entry) => {
      const label = visit.items.find((item) => item.productId === entry.productId)?.productSnapshotName ?? "Produto";
      return `${label}: precisa ${entry.requiredQuantity}, disponivel ${entry.availableQuantity}`;
    })
    .join(" | ");

  return `Estoque central insuficiente. ${formattedItems}`;
}

function formatPaymentMethod(method: (typeof paymentMethods)[number]) {
  if (method === "BANK_TRANSFER") {
    return "Transferencia";
  }

  if (method === "CASH") {
    return "Dinheiro";
  }

  if (method === "CARD") {
    return "Cartao";
  }

  if (method === "PIX") {
    return "PIX";
  }

  return "Outro";
}
