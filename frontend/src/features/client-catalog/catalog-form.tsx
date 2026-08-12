import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, Checkbox, ErrorBanner, Field, Input, MoneyInput, PageLoader, Select, StickyActionBar } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { isNonNegativeIntegerInput, parseDecimalInput, toNullableNumber } from "../../lib/forms";
import type { Client, ClientProduct } from "../../types/domain";
import { listProducts } from "../products/products-api";
import { createClientCatalogItem, updateClientCatalogItem } from "./catalog-api";

const catalogFormSchema = z.object({
  productId: z.string().trim().min(1, "Selecione um produto"),
  currentUnitPrice: z
    .string()
    .trim()
    .min(1, "Informe o preço")
    .refine((value) => !Number.isNaN(parseDecimalInput(value)) && parseDecimalInput(value) >= 0, "Informe um valor válido"),
  idealQuantity: z
    .string()
    .trim()
    .refine((value) => value === "" || isNonNegativeIntegerInput(value), "Informe uma quantidade inteira válida"),
  displayOrder: z
    .string()
    .trim()
    .refine((value) => value === "" || isNonNegativeIntegerInput(value), "Informe uma ordem inteira válida"),
  isActive: z.boolean()
});

type CatalogFormValues = z.infer<typeof catalogFormSchema>;

type CatalogFormProps = {
  client: Client;
  mode: "create" | "edit";
  item?: ClientProduct;
};

export function CatalogForm({ client, mode, item }: CatalogFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products", "catalog-select"],
    queryFn: () => listProducts({ isActive: true })
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      productId: item?.productId ?? "",
      currentUnitPrice: item ? String(item.currentUnitPrice) : "",
      idealQuantity: item?.idealQuantity !== null && item?.idealQuantity !== undefined ? String(item.idealQuantity) : "",
      displayOrder: item?.displayOrder !== null && item?.displayOrder !== undefined ? String(item.displayOrder) : "",
      isActive: item?.isActive ?? true
    }
  });
  const isActive = useWatch({ control, name: "isActive" });

  const mutation = useMutation({
    mutationFn: async (values: CatalogFormValues) => {
      const payload = {
        currentUnitPrice: parseDecimalInput(values.currentUnitPrice),
        idealQuantity: toNullableNumber(values.idealQuantity),
        displayOrder: toNullableNumber(values.displayOrder),
        isActive: values.isActive
      };

      return mode === "create"
        ? createClientCatalogItem(client.id, { ...payload, productId: values.productId })
        : updateClientCatalogItem(client.id, item!.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-catalog", client.id] });
      await navigate(`/clients/${client.id}/catalog`, { replace: true });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  if (productsQuery.isPending) {
    return <PageLoader label="Carregando produtos..." />;
  }

  if (productsQuery.isError) {
    return <ErrorBanner message="Não foi possível carregar os produtos ativos para o catálogo." />;
  }

  return (
    <Card>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}

        <Field label="Produto" error={errors.productId?.message}>
          <Select disabled={mode === "edit"} {...register("productId")}>
            <option value="">Selecione um produto</option>
            {productsQuery.data?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku}) - {formatCurrency(product.basePrice)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Preço" error={errors.currentUnitPrice?.message}>
          <MoneyInput {...register("currentUnitPrice")} />
        </Field>

        <details className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--jam-ink)]">
            Mais ajustes
          </summary>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade ideal" error={errors.idealQuantity?.message}>
              <Input inputMode="numeric" placeholder="12" {...register("idealQuantity")} />
            </Field>

            <Field label="Ordem" error={errors.displayOrder?.message}>
              <Input inputMode="numeric" placeholder="1" {...register("displayOrder")} />
            </Field>
          </div>

          <div className="mt-4">
            <Checkbox
              {...register("isActive")}
              label="Ativo nas próximas visitas"
              hint={`Mix configurado de ${client.tradeName}`}
              checked={Boolean(isActive)}
              onChange={(event) => setValue("isActive", event.target.checked, { shouldDirty: true })}
            />
          </div>
        </details>

        <StickyActionBar>
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : mode === "create" ? "Adicionar ao mix" : "Salvar mix e preço"}
          </Button>
        </StickyActionBar>
      </form>
    </Card>
  );
}
