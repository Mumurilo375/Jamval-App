import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, Select, Textarea, ToneBadge } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { VisitDetail } from "../../types/domain";
import { completeVisit } from "./visits-api";
import { computeVisitPendingAmount, visitNumber, visitStatusLabel, visitStatusTone } from "./visit-utils";

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

  const totalAmount = visitNumber(visit.totalAmount);
  const receivedAmount = visitNumber(visit.receivedAmountOnVisit);
  const pendingAmount = computeVisitPendingAmount(totalAmount, receivedAmount);
  const canComplete = visit.items.length > 0;

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
      await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.setQueryData(["visit", completedVisit.id], completedVisit);
      setIsFormOpen(false);
      reset();
    }
  });

  if (visit.status !== "DRAFT") {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Conclusao</p>
            <p className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">Visita concluida</p>
          </div>
          <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">
          Concluida em {formatDate(visit.completedAt)}. A visita agora fica somente para leitura.
        </p>
      </Card>
    );
  }

  const mutationError = completionMutation.error instanceof ApiError ? completionMutation.error : null;
  const requiresInitialPayment = receivedAmount > 0;

  const onDirectComplete = async () => {
    if (!window.confirm("Concluir esta visita agora?")) {
      return;
    }

    await completionMutation.mutateAsync(undefined);
  };

  const onSubmit = handleSubmit(async (values) => {
    await completionMutation.mutateAsync(values);
  });

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Conclusao</p>
          <p className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">Etapa final</p>
          <p className="mt-1 text-sm text-[var(--jam-subtle)]">Conclua a visita somente depois de revisar conferencia e financeiro.</p>
        </div>
        <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryMetric label="Total a cobrar" value={formatCurrency(totalAmount)} />
        <SummaryMetric label="Valor recebido" value={formatCurrency(receivedAmount)} />
        <SummaryMetric label="Saldo pendente" value={formatCurrency(pendingAmount)} />
      </div>

      {!canComplete ? (
        <p className="text-sm text-[var(--jam-subtle)]">
          Adicione pelo menos um item conferido antes de concluir a visita.
        </p>
      ) : requiresInitialPayment ? (
        <p className="text-sm text-[var(--jam-subtle)]">
          Como houve valor recebido na visita, confirme a forma do pagamento inicial antes da conclusao.
        </p>
      ) : (
        <p className="text-sm text-[var(--jam-subtle)]">
          O valor recebido esta zerado. Se a conferencia estiver correta, a visita pode ser concluida sem pagamento inicial.
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
              Voltar
            </Button>
            <Button type="submit" disabled={completionMutation.isPending || !canComplete}>
              {completionMutation.isPending ? "Concluindo..." : "Confirmar conclusao"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3">
          {requiresInitialPayment ? (
            <Button variant="secondary" onClick={() => setIsFormOpen(true)} disabled={completionMutation.isPending || !canComplete}>
              Informar pagamento inicial
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void onDirectComplete()} disabled={completionMutation.isPending || !canComplete}>
              {completionMutation.isPending ? "Concluindo..." : "Concluir visita"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function formatCompletionError(error: ApiError, visit: VisitDetail): string {
  if (error.code !== "INSUFFICIENT_CENTRAL_STOCK") {
    return error.message;
  }

  const rawItems = (
    error.details as { visitProducts?: Array<{ productId: string; requiredQuantity: number; availableQuantity: number }> } | null
  )?.visitProducts;

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
