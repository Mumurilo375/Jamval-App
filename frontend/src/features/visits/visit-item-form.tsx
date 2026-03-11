import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, Select } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { ClientProduct, VisitDetail, VisitItem } from "../../types/domain";
import { bulkUpsertVisitItems, patchVisitItem } from "./visits-api";
import { computeVisitItemPreview } from "./visit-utils";

const visitItemFormSchema = z.object({
  clientProductId: z.string().trim().min(1, "Selecione um produto do catalogo"),
  quantityPrevious: numericField("Informe a quantidade anterior"),
  quantityGoodRemaining: numericField("Informe a quantidade boa restante"),
  quantityDefectiveReturn: numericField("Informe a quantidade com defeito"),
  quantityLoss: numericField("Informe a quantidade perdida"),
  unitPrice: moneyField("Informe o preco unitario"),
  suggestedRestockQuantity: numericField("Informe a reposicao sugerida"),
  restockedQuantity: numericField("Informe a reposicao feita"),
  notes: z.string()
});

type VisitItemFormValues = z.infer<typeof visitItemFormSchema>;

type VisitItemFormProps = {
  mode: "create" | "edit";
  visit: VisitDetail;
  catalogItems: ClientProduct[];
  item?: VisitItem;
};

export function VisitItemForm({ mode, visit, catalogItems, item }: VisitItemFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<VisitItemFormValues>({
    resolver: zodResolver(visitItemFormSchema),
    defaultValues: {
      clientProductId: item?.clientProductId ?? "",
      quantityPrevious: item ? String(item.quantityPrevious) : "",
      quantityGoodRemaining: item ? String(item.quantityGoodRemaining) : "",
      quantityDefectiveReturn: item ? String(item.quantityDefectiveReturn) : "0",
      quantityLoss: item ? String(item.quantityLoss) : "0",
      unitPrice: item ? String(item.unitPrice) : "",
      suggestedRestockQuantity: item ? String(item.suggestedRestockQuantity) : "0",
      restockedQuantity: item ? String(item.restockedQuantity) : "0",
      notes: item?.notes ?? ""
    }
  });

  const selectedClientProductId = watch("clientProductId");
  const selectedCatalogItem = useMemo(
    () => catalogItems.find((entry) => entry.id === selectedClientProductId) ?? null,
    [catalogItems, selectedClientProductId]
  );

  useEffect(() => {
    if (mode !== "create" || !selectedCatalogItem) {
      return;
    }

    const currentUnitPrice = watch("unitPrice");
    if (!currentUnitPrice) {
      setValue("unitPrice", String(selectedCatalogItem.currentUnitPrice), { shouldDirty: true });
    }

    const suggestedRestockQuantity = watch("suggestedRestockQuantity");
    if (!suggestedRestockQuantity && selectedCatalogItem.idealQuantity !== null) {
      setValue("suggestedRestockQuantity", String(selectedCatalogItem.idealQuantity), { shouldDirty: true });
    }
  }, [mode, selectedCatalogItem, setValue, watch]);

  const preview = computeVisitItemPreview({
    quantityPrevious: Number(watch("quantityPrevious") || 0),
    quantityGoodRemaining: Number(watch("quantityGoodRemaining") || 0),
    quantityDefectiveReturn: Number(watch("quantityDefectiveReturn") || 0),
    quantityLoss: Number(watch("quantityLoss") || 0),
    unitPrice: Number(watch("unitPrice") || 0),
    restockedQuantity: Number(watch("restockedQuantity") || 0)
  });

  const createMutation = useMutation({
    mutationFn: async (values: VisitItemFormValues) => {
      const clientProduct = catalogItems.find((entry) => entry.id === values.clientProductId)!;
      return bulkUpsertVisitItems(visit.id, [
        {
          productId: clientProduct.productId,
          clientProductId: clientProduct.id,
          quantityPrevious: Number(values.quantityPrevious),
          quantityGoodRemaining: Number(values.quantityGoodRemaining),
          quantityDefectiveReturn: Number(values.quantityDefectiveReturn),
          quantityLoss: Number(values.quantityLoss),
          unitPrice: Number(values.unitPrice),
          suggestedRestockQuantity: Number(values.suggestedRestockQuantity),
          restockedQuantity: Number(values.restockedQuantity),
          notes: values.notes.trim() || undefined
        }
      ]);
    },
    onSuccess: async (nextVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
      await navigate(`/visits/${nextVisit.id}`, { replace: true });
    }
  });

  const patchMutation = useMutation({
    mutationFn: async (values: VisitItemFormValues) => {
      return patchVisitItem(visit.id, item!.id, {
        clientProductId: values.clientProductId,
        quantityPrevious: Number(values.quantityPrevious),
        quantityGoodRemaining: Number(values.quantityGoodRemaining),
        quantityDefectiveReturn: Number(values.quantityDefectiveReturn),
        quantityLoss: Number(values.quantityLoss),
        unitPrice: Number(values.unitPrice),
        suggestedRestockQuantity: Number(values.suggestedRestockQuantity),
        restockedQuantity: Number(values.restockedQuantity),
        notes: values.notes.trim() || undefined
      });
    },
    onSuccess: async (nextVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
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

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <form className="space-y-4" onSubmit={onSubmit}>
          {mutationError instanceof ApiError ? <ErrorBanner message={mutationError.message} /> : null}

          {mode === "create" ? (
            <Field label="Produto do catalogo" error={errors.clientProductId?.message}>
              <Select {...register("clientProductId")}>
                <option value="">Selecione um item do catalogo</option>
                {catalogItems.map((catalogItem) => (
                  <option key={catalogItem.id} value={catalogItem.id}>
                    {catalogItem.product.name} ({catalogItem.product.sku}) · {formatCurrency(catalogItem.currentUnitPrice)}
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

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Quantidade anterior" error={errors.quantityPrevious?.message} registration={register("quantityPrevious")} />
            <NumberField
              label="Boa restante"
              error={errors.quantityGoodRemaining?.message}
              registration={register("quantityGoodRemaining")}
            />
            <NumberField
              label="Defeituosa"
              error={errors.quantityDefectiveReturn?.message}
              registration={register("quantityDefectiveReturn")}
            />
            <NumberField label="Perda" error={errors.quantityLoss?.message} registration={register("quantityLoss")} />
            <NumberField
              label="Reposicao sugerida"
              error={errors.suggestedRestockQuantity?.message}
              registration={register("suggestedRestockQuantity")}
            />
            <NumberField
              label="Reposicao feita"
              error={errors.restockedQuantity?.message}
              registration={register("restockedQuantity")}
            />
          </div>

          <Field label="Preco unitario" error={errors.unitPrice?.message}>
            <Input inputMode="decimal" placeholder="39.90" {...register("unitPrice")} />
          </Field>

          <Field label="Observacoes">
            <Input placeholder="Notas rapidas sobre o item" {...register("notes")} />
          </Field>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : mode === "create" ? "Adicionar item" : "Salvar item"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Resumo do item</p>
        <div className="grid grid-cols-2 gap-3">
          <PreviewMetric label="Vendida" value={preview.quantitySold} highlight />
          <PreviewMetric label="Subtotal" value={formatCurrency(preview.subtotalAmount)} highlight />
          <PreviewMetric label="Saldo final" value={preview.resultingClientQuantity} />
          <PreviewMetric label="Preco" value={formatCurrency(Number(watch("unitPrice") || 0))} />
        </div>
        {preview.quantitySold < 0 ? (
          <p className="text-sm font-medium text-[var(--jam-danger)]">
            A conta ficou negativa. Ajuste as quantidades para o item poder ser salvo.
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
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, message);
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
    <div className={highlight ? "rounded-2xl bg-[rgba(245,158,11,0.16)] p-3" : "rounded-2xl bg-white/80 p-3"}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}
