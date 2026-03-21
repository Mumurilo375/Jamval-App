import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, Select, WarningBanner } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { VisitDetail, VisitItem } from "../../types/domain";
import { bulkUpsertVisitItems, listCentralBalances, patchVisitItem } from "./visits-api";
import { computeVisitItemPreview, parseDecimalInput } from "./visit-utils";

const visitItemFormSchema = z.object({
  selectedProductId: z.string().trim().min(1, "Selecione um produto"),
  quantityPrevious: numericField("Informe a quantidade anterior"),
  quantityGoodRemaining: numericField("Informe o restante na loja"),
  quantityDefectiveReturn: numericField("Informe a quantidade de trocas"),
  unitPrice: moneyField("Informe o preco unitario"),
  restockedQuantity: numericField("Informe a quantidade reposta"),
  notes: z.string()
});

type VisitItemFormValues = z.infer<typeof visitItemFormSchema>;

export type VisitSelectableProduct = {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  clientProductId: string | null;
};

type VisitItemFormProps = {
  mode: "create" | "edit";
  visit: VisitDetail;
  productOptions: VisitSelectableProduct[];
  item?: VisitItem;
  suggestedPreviousByProductId?: Record<string, number>;
};

export function VisitItemForm({
  mode,
  visit,
  productOptions,
  item,
  suggestedPreviousByProductId = {}
}: VisitItemFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const autoSeedRef = useRef<{ productId: string | null; quantityPrevious: string }>({
    productId: item?.productId ?? null,
    quantityPrevious: item ? String(item.quantityPrevious) : ""
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<VisitItemFormValues>({
    resolver: zodResolver(visitItemFormSchema),
    defaultValues: {
      selectedProductId: item?.productId ?? "",
      quantityPrevious: item ? String(item.quantityPrevious) : "",
      quantityGoodRemaining: item ? String(item.quantityGoodRemaining) : "",
      quantityDefectiveReturn: item ? String(item.quantityDefectiveReturn) : "0",
      unitPrice: item ? String(item.unitPrice) : "",
      restockedQuantity: item ? String(item.restockedQuantity) : "0",
      notes: item?.notes ?? ""
    }
  });

  const selectedProductId = watch("selectedProductId");
  const quantityPreviousValue = watch("quantityPrevious");
  const quantityGoodRemainingValue = watch("quantityGoodRemaining");
  const quantityDefectiveReturnValue = watch("quantityDefectiveReturn");
  const unitPriceValue = watch("unitPrice");
  const restockedQuantityValue = watch("restockedQuantity");
  const selectedProduct = useMemo(
    () => productOptions.find((entry) => entry.productId === selectedProductId) ?? null,
    [productOptions, selectedProductId]
  );
  const selectedProductIdForBalance = selectedProduct?.productId ?? item?.productId ?? null;
  const suggestedPreviousQuantity = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    const rawValue = suggestedPreviousByProductId[selectedProduct.productId];
    return rawValue === undefined ? null : rawValue;
  }, [selectedProduct, suggestedPreviousByProductId]);
  const centralBalanceQuery = useQuery({
    queryKey: ["stock", "central-balances", selectedProductIdForBalance],
    queryFn: () => listCentralBalances([selectedProductIdForBalance!]),
    enabled: Boolean(selectedProductIdForBalance)
  });

  useEffect(() => {
    if (mode !== "create" || !selectedProduct) {
      return;
    }

    const productChanged = autoSeedRef.current.productId !== selectedProduct.productId;
    const nextSuggestedPrevious = suggestedPreviousQuantity !== null ? String(suggestedPreviousQuantity) : "";

    if (productChanged) {
      setValue("unitPrice", String(selectedProduct.unitPrice), {
        shouldDirty: false,
        shouldValidate: true
      });
      setValue("quantityPrevious", nextSuggestedPrevious, {
        shouldDirty: false,
        shouldValidate: true
      });
      autoSeedRef.current = {
        productId: selectedProduct.productId,
        quantityPrevious: nextSuggestedPrevious
      };
      return;
    }

    const currentQuantityPrevious = getValues("quantityPrevious");
    if (
      nextSuggestedPrevious &&
      (currentQuantityPrevious === "" || currentQuantityPrevious === autoSeedRef.current.quantityPrevious)
    ) {
      setValue("quantityPrevious", nextSuggestedPrevious, {
        shouldDirty: false,
        shouldValidate: true
      });
      autoSeedRef.current = {
        productId: selectedProduct.productId,
        quantityPrevious: nextSuggestedPrevious
      };
    }
  }, [getValues, mode, selectedProduct, setValue, suggestedPreviousQuantity]);

  const availableCentralQuantity = useMemo(
    () => centralBalanceQuery.data?.[0]?.currentQuantity ?? 0,
    [centralBalanceQuery.data]
  );
  const unitPriceNumber = useMemo(() => {
    const parsed = parseDecimalInput(unitPriceValue || "0");
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [unitPriceValue]);
  const restockedQuantity = Number(restockedQuantityValue || 0);
  const stockWarningMessage =
    selectedProductIdForBalance && !centralBalanceQuery.isError && restockedQuantity > availableCentralQuantity
      ? `Quantidade reposta maior que o estoque central disponivel. Disponivel agora: ${availableCentralQuantity}. Reposto informado: ${restockedQuantity}.`
      : null;
  const preview = computeVisitItemPreview({
    quantityPrevious: Number(quantityPreviousValue || 0),
    quantityGoodRemaining: Number(quantityGoodRemainingValue || 0),
    quantityDefectiveReturn: Number(quantityDefectiveReturnValue || 0),
    quantityLoss: 0,
    unitPrice: unitPriceNumber,
    restockedQuantity: Number(restockedQuantityValue || 0)
  });

  const createMutation = useMutation({
    mutationFn: async (values: VisitItemFormValues) => {
      const selectedProductOption = productOptions.find((entry) => entry.productId === values.selectedProductId);

      if (!selectedProductOption) {
        throw new Error("Selecione um produto valido para a visita.");
      }

      return bulkUpsertVisitItems(visit.id, [
        {
          productId: selectedProductOption.productId,
          clientProductId: selectedProductOption.clientProductId,
          quantityPrevious: Number(values.quantityPrevious),
          quantityGoodRemaining: Number(values.quantityGoodRemaining),
          quantityDefectiveReturn: Number(values.quantityDefectiveReturn),
          quantityLoss: 0,
          unitPrice: parseDecimalInput(values.unitPrice),
          suggestedRestockQuantity: 0,
          restockedQuantity: Number(values.restockedQuantity),
          notes: values.notes.trim() || undefined
        }
      ]);
    },
    onSuccess: async (nextVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
      queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
      await navigate(`/visits/${nextVisit.id}`, { replace: true });
    }
  });

  const patchMutation = useMutation({
    mutationFn: async (values: VisitItemFormValues) =>
      patchVisitItem(visit.id, item!.id, {
        clientProductId: item!.clientProductId,
        quantityPrevious: Number(values.quantityPrevious),
        quantityGoodRemaining: Number(values.quantityGoodRemaining),
        quantityDefectiveReturn: Number(values.quantityDefectiveReturn),
        quantityLoss: 0,
        unitPrice: parseDecimalInput(values.unitPrice),
        suggestedRestockQuantity: 0,
        restockedQuantity: Number(values.restockedQuantity),
        notes: values.notes.trim() || undefined
      }),
    onSuccess: async (nextVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
      queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
      await navigate(`/visits/${nextVisit.id}`, { replace: true });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    if (mode === "create") {
      await createMutation.mutateAsync(values);
      return;
    }

    await patchMutation.mutateAsync(values);
  });

  const mutationError = createMutation.error ?? patchMutation.error;
  const isSubmitting = createMutation.isPending || patchMutation.isPending;
  const quantityPreviousHint =
    mode === "create"
      ? selectedProduct
        ? suggestedPreviousQuantity !== null
          ? "Anterior no cliente sugerido pela ultima visita concluida."
          : "Primeira visita deste item para o cliente. Use 0 se nao havia saldo anterior."
        : "Selecione um produto para iniciar a conferencia."
      : "Use esse saldo como base da conferencia atual.";

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <form className="space-y-5" onSubmit={onSubmit}>
          {mutationError instanceof ApiError ? <ErrorBanner message={mutationError.message} /> : null}

          {mode === "create" ? (
            <Field label="Produto" error={errors.selectedProductId?.message}>
              <Select {...register("selectedProductId")}>
                <option value="">Selecione um produto</option>
                {productOptions.map((productOption) => (
                  <option key={productOption.productId} value={productOption.productId}>
                    {productOption.productName} ({productOption.productSku}) - {formatCurrency(productOption.unitPrice)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Produto">
              <div className="rounded-2xl border border-[var(--jam-border)] bg-white/80 px-4 py-3 text-sm font-medium text-[var(--jam-ink)]">
                {item?.productSnapshotLabel || item?.productSnapshotName}
              </div>
            </Field>
          )}

          <div className="space-y-3">
            <SectionLabel
              title="Base da conferencia"
              subtitle="Primeiro confirme qual era o saldo anterior do produto no cliente."
            />

            <div className="rounded-2xl border border-[rgba(29,78,216,0.18)] bg-[rgba(29,78,216,0.04)] p-4">
              <Field label="Anterior no cliente" hint={quantityPreviousHint} error={errors.quantityPrevious?.message}>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  className="min-h-14 text-center font-display text-3xl font-semibold"
                  {...register("quantityPrevious")}
                />
              </Field>
            </div>

            <Field label="Preco unitario" error={errors.unitPrice?.message}>
              <Input inputMode="decimal" placeholder="39.90" {...register("unitPrice")} />
            </Field>
          </div>

          <div className="space-y-3">
            <SectionLabel
              title="Conferencia atual"
              subtitle="Conte o que sobrou no local e informe apenas o que foi visto agora."
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Restante na loja"
                error={errors.quantityGoodRemaining?.message}
                registration={register("quantityGoodRemaining")}
              />
              <NumberField
                label="Trocas"
                error={errors.quantityDefectiveReturn?.message}
                registration={register("quantityDefectiveReturn")}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel
              title="Reposicao para a proxima visita"
              subtitle="Defina o que esta voltando para o cliente ainda nesta mesma visita."
            />

            <NumberField
              label="Quantidade reposta"
              error={errors.restockedQuantity?.message}
              registration={register("restockedQuantity")}
            />

            {stockWarningMessage ? <WarningBanner message={stockWarningMessage} /> : null}
          </div>

          <Field label="Observacoes">
            <Input placeholder="Notas rapidas sobre o item" {...register("notes")} />
          </Field>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar conferencia" : "Salvar conferencia"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <SectionLabel
          title="Resultado automatico da conferencia"
          subtitle="O sistema calcula automaticamente o vendido, a cobranca e o novo saldo do cliente."
        />

        <div className="grid grid-cols-2 gap-3">
          <PreviewMetric label="Vendido" value={preview.quantitySold} highlight />
          <PreviewMetric label="Preco unitario" value={formatCurrency(unitPriceNumber)} />
          <PreviewMetric label="Subtotal da cobranca" value={formatCurrency(preview.subtotalAmount)} highlight />
          <PreviewMetric label="Novo saldo no cliente" value={preview.resultingClientQuantity} />
        </div>

        {preview.quantitySold < 0 ? (
          <p className="text-sm font-medium text-[var(--jam-danger)]">
            A conta ficou negativa. Revise a contagem atual antes de salvar a conferencia.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function numericField(message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, message);
}

function moneyField(message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => !Number.isNaN(parseDecimalInput(value)) && parseDecimalInput(value) >= 0, message);
}

function SectionLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p>
    </div>
  );
}

function NumberField({
  label,
  error,
  registration
}: {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <Field label={label} error={error}>
      <Input inputMode="numeric" placeholder="0" {...registration} />
    </Field>
  );
}

function PreviewMetric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl bg-[rgba(245,158,11,0.14)] p-3" : "rounded-2xl bg-white/80 p-3"}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
