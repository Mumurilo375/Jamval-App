import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { VisitDetail } from "../../types/domain";
import { updateVisit } from "./visits-api";
import { computeVisitPendingAmount, parseDecimalInput, visitNumber } from "./visit-utils";

const financialFormSchema = z.object({
  receivedAmountOnVisit: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(parseDecimalInput(value)) && parseDecimalInput(value) >= 0),
      "Informe um valor valido"
    )
});

type FinancialFormValues = z.infer<typeof financialFormSchema>;

type VisitFinancialPanelProps = {
  visit: VisitDetail;
};

export function VisitFinancialPanel({ visit }: VisitFinancialPanelProps) {
  const queryClient = useQueryClient();
  const totalAmount = visitNumber(visit.totalAmount);
  const receivedAmount = visitNumber(visit.receivedAmountOnVisit);
  const pendingAmount = computeVisitPendingAmount(totalAmount, receivedAmount);
  const isDraft = visit.status === "DRAFT";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FinancialFormValues>({
    resolver: zodResolver(financialFormSchema),
    defaultValues: {
      receivedAmountOnVisit: String(receivedAmount)
    }
  });

  useEffect(() => {
    reset({
      receivedAmountOnVisit: String(visitNumber(visit.receivedAmountOnVisit))
    });
  }, [reset, visit.receivedAmountOnVisit]);

  const mutation = useMutation({
    mutationFn: async (values: FinancialFormValues) =>
      updateVisit(visit.id, {
        receivedAmountOnVisit: values.receivedAmountOnVisit === "" ? 0 : parseDecimalInput(values.receivedAmountOnVisit)
      }),
    onSuccess: async (nextVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
      queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
      reset({
        receivedAmountOnVisit: String(visitNumber(nextVisit.receivedAmountOnVisit))
      });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Financeiro da visita</p>
        <p className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">Recebimento depois da conferencia</p>
        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
          Primeiro confira os produtos e o total a cobrar. Depois informe quanto entrou nesta visita.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FinancialMetric label="Total a cobrar" value={formatCurrency(totalAmount)} highlight />
        <FinancialMetric label="Valor recebido" value={formatCurrency(receivedAmount)} />
        <FinancialMetric label="Saldo pendente" value={formatCurrency(pendingAmount)} />
      </div>

      {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}

      {isDraft ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field
            label="Valor recebido na visita"
            hint="Esse valor entra somente depois da conferencia e do total a cobrar."
            error={errors.receivedAmountOnVisit?.message}
          >
            <Input inputMode="decimal" placeholder="0,00" {...register("receivedAmountOnVisit")} />
          </Field>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar valor recebido"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--jam-subtle)]">
          O valor recebido ficou registrado junto com a visita concluida.
        </p>
      )}
    </Card>
  );
}

function FinancialMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl bg-[rgba(29,78,216,0.08)] p-3" : "rounded-xl bg-white p-3"}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
