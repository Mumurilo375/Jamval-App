import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import {
  Button,
  Card,
  Checkbox,
  ErrorBanner,
  Field,
  Input,
  MoneyInput,
  StickyActionBar,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { parseDecimalInput, toOptionalString } from "../../lib/forms";
import type { Product } from "../../types/domain";
import { createProduct, updateProduct } from "./products-api";

const productFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "Informe o SKU")
    .max(120, "Use até 120 caracteres"),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome")
    .max(200, "Use até 200 caracteres"),
  category: z.string().max(120, "Use até 120 caracteres"),
  brand: z.string().max(120, "Use até 120 caracteres"),
  model: z.string().max(120, "Use até 120 caracteres"),
  color: z.string().max(80, "Use até 80 caracteres"),
  voltage: z.string().max(80, "Use até 80 caracteres"),
  connectorType: z.string().max(80, "Use até 80 caracteres"),
  basePrice: z
    .string()
    .trim()
    .min(1, "Informe o preço base")
    .refine(
      (value) =>
        !Number.isNaN(parseDecimalInput(value)) &&
        parseDecimalInput(value) >= 0,
      "Informe um valor válido",
    ),
  costPrice: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.length === 0 ||
        (!Number.isNaN(parseDecimalInput(value)) &&
          parseDecimalInput(value) >= 0),
      "Informe um valor válido",
    ),
  isActive: z.boolean(),
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
    control,
    formState: { errors },
    setValue,
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
      costPrice:
        product?.costPrice !== null && product?.costPrice !== undefined
          ? String(product.costPrice)
          : "",
      isActive: product?.isActive ?? true,
    },
  });
  const isActive = useWatch({ control, name: "isActive" });

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
        basePrice: parseDecimalInput(values.basePrice),
        costPrice:
          values.costPrice.trim().length > 0
            ? parseDecimalInput(values.costPrice)
            : null,
        isActive: values.isActive,
      };

      return mode === "create"
        ? createProduct(payload)
        : updateProduct(product!.id, payload);
    },
    onSuccess: async (savedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({
        queryKey: ["product", savedProduct.id],
      });
      await navigate("/products", { replace: true });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mutation.error instanceof ApiError ? (
          <ErrorBanner message={mutation.error.message} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" error={errors.sku?.message}>
            <Input
              placeholder="CABO-TYPEC-1M"
              maxLength={120}
              {...register("sku")}
            />
          </Field>

        <Field label="Preço base" error={errors.basePrice?.message}>
          <MoneyInput {...register("basePrice")} />
        </Field>
      </div>

        <Field
          label="Custo de compra"
          hint="Opcional. Use como custo inicial de compra. O custo real usado na operação vem das entradas de estoque."
          error={errors.costPrice?.message}
        >
          <MoneyInput {...register("costPrice")} />
        </Field>

        <Field label="Nome" error={errors.name?.message}>
          <Input
            placeholder="Cabo Type-C 1m"
            maxLength={200}
            {...register("name")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" error={errors.category?.message}>
            <Input
              placeholder="Cabos"
              maxLength={120}
              {...register("category")}
            />
          </Field>

          <Field label="Marca" error={errors.brand?.message}>
            <Input
              placeholder="Baseus"
              maxLength={120}
              {...register("brand")}
            />
          </Field>

          <Field label="Modelo" error={errors.model?.message}>
            <Input
              placeholder="Fast Charge"
              maxLength={120}
              {...register("model")}
            />
          </Field>

          <Field label="Cor" error={errors.color?.message}>
            <Input placeholder="Preto" maxLength={80} {...register("color")} />
          </Field>

          <Field label="Voltagem" error={errors.voltage?.message}>
            <Input placeholder="5V" maxLength={80} {...register("voltage")} />
          </Field>

          <Field label="Conector" error={errors.connectorType?.message}>
            <Input
              placeholder="USB-C"
              maxLength={80}
              {...register("connectorType")}
            />
          </Field>
        </div>

        <Checkbox
          {...register("isActive")}
          label="Produto ativo"
          hint="Produtos inativos continuam no histórico, mas saem da operação diária."
          checked={Boolean(isActive)}
          onChange={(event) =>
            setValue("isActive", event.target.checked, { shouldDirty: true })
          }
        />

        <StickyActionBar>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Salvando..."
              : mode === "create"
                ? "Criar produto"
                : "Salvar alterações"}
          </Button>
        </StickyActionBar>
      </form>
    </Card>
  );
}
