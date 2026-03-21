import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, Checkbox, ErrorBanner, Field, Input, PageLoader, Select } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { toNullableNumber } from "../../lib/forms";
import type { Client, ClientProduct } from "../../types/domain";
import { listProducts } from "../products/products-api";
import { createClientCatalogItem, updateClientCatalogItem } from "./catalog-api";

const catalogFormSchema = z.object({
  productId: z.string().trim().min(1, "Selecione um produto"),
  currentUnitPrice: z
    .string()
    .trim()
    .min(1, "Informe o preco")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Informe um valor valido"),
  idealQuantity: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Informe uma quantidade valida"),
  displayOrder: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Informe uma ordem valida"),
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
    formState: { errors },
    setValue,
    watch
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

  const mutation = useMutation({
    mutationFn: async (values: CatalogFormValues) => {
      const payload = {
        productId: values.productId,
        currentUnitPrice: Number(values.currentUnitPrice),
        idealQuantity: toNullableNumber(values.idealQuantity),
        displayOrder: toNullableNumber(values.displayOrder),
        isActive: values.isActive
      };

      return mode === "create"
        ? createClientCatalogItem(client.id, payload)
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
    return <ErrorBanner message="Nao foi possivel carregar os produtos ativos para o catalogo." />;
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

        <Field label="Preco" error={errors.currentUnitPrice?.message}>
          <Input inputMode="decimal" placeholder="39.90" {...register("currentUnitPrice")} />
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
              label="Ativo nas proximas visitas"
              hint={`Mix configurado de ${client.tradeName}`}
              checked={watch("isActive")}
              onChange={(event) => setValue("isActive", event.target.checked, { shouldDirty: true })}
            />
          </div>
        </details>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : mode === "create" ? "Adicionar ao mix" : "Salvar mix e preco"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
