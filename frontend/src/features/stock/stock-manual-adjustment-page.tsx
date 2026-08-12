import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  PageLoader,
  RetryableErrorState,
  Select,
  StickyActionBar,
  Textarea,
  WarningBanner
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { listProducts } from "../products/products-api";
import { createCentralManualAdjustment, getCentralOverview } from "./stock-api";

const adjustmentFormSchema = z.object({
  productId: z.string().trim().min(1, "Selecione o produto"),
  direction: z.enum(["IN", "OUT"]),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade")
    .refine((value) => /^\d+$/.test(value) && Number(value) > 0, "Informe uma quantidade inteira maior que zero"),
    reason: z.string().trim().min(1, "Informe o motivo do ajuste").max(500, "Use até 500 caracteres")
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

export function StockManualAdjustmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products", "stock-adjustment-options"],
    queryFn: () => listProducts({})
  });
  const overviewQuery = useQuery({
    queryKey: ["stock", "overview"],
    queryFn: getCentralOverview
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      productId: "",
      direction: "IN",
      quantity: "",
      reason: ""
    }
  });

  const selectedProductId = useWatch({ control, name: "productId" });
  const selectedDirection = useWatch({ control, name: "direction" });
  const overviewItem = useMemo(
    () => overviewQuery.data?.items.find((item) => item.productId === selectedProductId) ?? null,
    [overviewQuery.data?.items, selectedProductId]
  );

  const mutation = useMutation({
    mutationFn: async (values: AdjustmentFormValues) =>
      createCentralManualAdjustment({
        productId: values.productId,
        direction: values.direction,
        quantity: Number(values.quantity),
        reason: values.reason.trim()
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
      navigate("/stock?tab=saldo", { replace: true });
    }
  });

  if (productsQuery.isPending || overviewQuery.isPending) {
    return <PageLoader label="Carregando ajuste..." />;
  }

  if (productsQuery.isError || overviewQuery.isError) {
    return (
      <RetryableErrorState
        title="Não foi possível abrir o ajuste"
        message="Confira a conexão com o backend e tente novamente."
        onRetry={() => {
          void productsQuery.refetch();
          void overviewQuery.refetch();
        }}
      />
    );
  }

  const products = productsQuery.data ?? [];

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          backTo="/stock?tab=saldo"
          backLabel="Estoque"
          eyebrow="Estoque central"
          title="Ajuste manual"
          subtitle="Fluxo corretivo para acertar diferenças do estoque central."
        />
        <EmptyState
          title="Cadastre produtos primeiro"
          message="O ajuste manual depende da base de produtos cadastrada."
          action={
            <Link to="/products">
              <Button>Ir para produtos</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const mutationError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/stock?tab=saldo"
        backLabel="Estoque"
        eyebrow="Estoque central"
        title="Ajuste manual"
        subtitle="Use apenas para correção operacional. Para mercadoria nova, o fluxo certo é Entrada manual."
      />

      <Card className="space-y-4">
        <WarningBanner message="Ajuste manual é um fluxo de correção. Não use para entrada normal de mercadoria." />

        {mutationError ? <ErrorBanner message={mutationError} /> : null}

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await mutation.mutateAsync(values);
          })}
        >
          <Field label="Produto" error={errors.productId?.message}>
            <Select {...register("productId")}>
              <option value="">Selecione um produto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}){product.isActive ? "" : " - inativo"}
                </option>
              ))}
            </Select>
          </Field>

          {overviewItem ? (
            <Card className="space-y-2 bg-white/70">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Saldo atual do produto</p>
              <p className="font-display text-3xl font-semibold text-[var(--jam-ink)]">{overviewItem.currentQuantity}</p>
              <p className="text-sm text-[var(--jam-subtle)]">Confira esse saldo antes de aplicar o ajuste.</p>
            </Card>
          ) : null}

          <Field label="Tipo do ajuste" error={errors.direction?.message}>
            <Select {...register("direction")}>
              <option value="IN">Aumentar saldo (+)</option>
              <option value="OUT">Reduzir saldo (-)</option>
            </Select>
          </Field>

          <Field label="Quantidade" error={errors.quantity?.message}>
            <Input inputMode="numeric" placeholder="0" {...register("quantity")} />
          </Field>

          {selectedDirection === "OUT" ? (
            <p className="text-sm text-[var(--jam-subtle)]">
              Ajuste de saída reduz o estoque central e não pode passar do saldo disponível.
            </p>
          ) : (
            <p className="text-sm text-[var(--jam-subtle)]">
              Ajuste de entrada corrige saldo para cima quando houver diferença positiva.
            </p>
          )}

          <Field label="Motivo do ajuste" error={errors.reason?.message}>
            <Textarea
              placeholder="Ex.: contagem refeita, avaria interna, caixa encontrada no depósito"
              maxLength={500}
              {...register("reason")}
            />
          </Field>

          <StickyActionBar>
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar ajuste"}
            </Button>
          </StickyActionBar>
        </form>
      </Card>
    </div>
  );
}
