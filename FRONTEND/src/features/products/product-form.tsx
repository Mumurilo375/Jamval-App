import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, Checkbox, ErrorBanner, Field, Input } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { toOptionalString } from "../../lib/forms";
import type { Product } from "../../types/domain";
import { createProduct, updateProduct } from "./products-api";

const productFormSchema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU"),
  name: z.string().trim().min(1, "Informe o nome"),
  category: z.string(),
  brand: z.string(),
  model: z.string(),
  color: z.string(),
  voltage: z.string(),
  connectorType: z.string(),
  basePrice: z
    .string()
    .trim()
    .min(1, "Informe o preco base")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Informe um valor valido"),
  costPrice: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Informe um valor valido"),
  isActive: z.boolean()
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product;
};

export function ProductForm({ mode, product }: ProductFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      category: product?.category ?? "",
      brand: product?.brand ?? "",
      model: product?.model ?? "",
      color: product?.color ?? "",
      voltage: product?.voltage ?? "",
      connectorType: product?.connectorType ?? "",
      basePrice: product ? String(product.basePrice) : "",
      costPrice: product?.costPrice !== null && product?.costPrice !== undefined ? String(product.costPrice) : "",
      isActive: product?.isActive ?? true
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        sku: values.sku.trim(),
        name: values.name.trim(),
        category: toOptionalString(values.category),
        brand: toOptionalString(values.brand),
        model: toOptionalString(values.model),
        color: toOptionalString(values.color),
        voltage: toOptionalString(values.voltage),
        connectorType: toOptionalString(values.connectorType),
        basePrice: Number(values.basePrice),
        costPrice: values.costPrice.trim().length > 0 ? Number(values.costPrice) : null,
        isActive: values.isActive
      };

      return mode === "create" ? createProduct(payload) : updateProduct(product!.id, payload);
    },
    onSuccess: async (savedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", savedProduct.id] });
      await navigate("/products", { replace: true });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" error={errors.sku?.message}>
            <Input placeholder="CABO-TYPEC-1M" {...register("sku")} />
          </Field>

          <Field label="Preco base" error={errors.basePrice?.message}>
            <Input inputMode="decimal" placeholder="29.90" {...register("basePrice")} />
          </Field>
        </div>

        <Field
          label="Custo de compra"
          hint="Usado na Administracao para lucro bruto estimado. Deixe em branco se ainda nao souber."
          error={errors.costPrice?.message}
        >
          <Input inputMode="decimal" placeholder="18.50" {...register("costPrice")} />
        </Field>

        <Field label="Nome" error={errors.name?.message}>
          <Input placeholder="Cabo Type-C 1m" {...register("name")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Input placeholder="Cabos" {...register("category")} />
          </Field>

          <Field label="Marca">
            <Input placeholder="Baseus" {...register("brand")} />
          </Field>

          <Field label="Modelo">
            <Input placeholder="Fast Charge" {...register("model")} />
          </Field>

          <Field label="Cor">
            <Input placeholder="Preto" {...register("color")} />
          </Field>

          <Field label="Voltagem">
            <Input placeholder="5V" {...register("voltage")} />
          </Field>

          <Field label="Conector">
            <Input placeholder="USB-C" {...register("connectorType")} />
          </Field>
        </div>

        <Checkbox
          {...register("isActive")}
          label="Produto ativo"
          hint="Produtos inativos continuam no historico, mas saem da operacao diaria."
          checked={watch("isActive")}
          onChange={(event) => setValue("isActive", event.target.checked, { shouldDirty: true })}
        />

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : mode === "create" ? "Criar produto" : "Salvar alteracoes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
