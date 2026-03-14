import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  PageLoader,
  Select,
  Textarea,
  WarningBanner
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { listProducts } from "../products/products-api";
import { getCentralOverview, type StockBatchPayload } from "./stock-api";

type StockBatchPageProps = {
  mode: "initial-load" | "manual-entry";
  submitBatch: (payload: StockBatchPayload) => Promise<unknown>;
};

type StockBatchRow = {
  id: string;
  productId: string;
  quantity: string;
};

export function StockBatchPage({ mode, submitBatch }: StockBatchPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<StockBatchRow[]>([createEmptyRow()]);
  const [formError, setFormError] = useState<string | null>(null);

  const isInitialLoad = mode === "initial-load";
  const productsQuery = useQuery({
    queryKey: ["products", "stock-batch-options"],
    queryFn: () => listProducts({})
  });
  const overviewQuery = useQuery({
    queryKey: ["stock", "overview"],
    queryFn: getCentralOverview,
    enabled: isInitialLoad
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const items = buildBatchItems(rows);

      if (items.length === 0) {
        throw new Error("Informe pelo menos um produto com quantidade maior que zero.");
      }

      return submitBatch({
        note: note.trim() || undefined,
        items
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
      navigate("/stock?tab=saldo", { replace: true });
    }
  });

  const selectedProductIds = useMemo(
    () => rows.map((row) => row.productId).filter(Boolean),
    [rows]
  );

  const pageCopy = isInitialLoad
    ? {
        eyebrow: "Estoque central",
        title: "Carga inicial",
        subtitle: "Monte o estoque pela primeira vez e depois siga com Entrada manual para novas mercadorias.",
        bannerMessage:
          "Use carga inicial apenas para montar o estoque pela primeira vez. Depois disso, o fluxo correto para novas mercadorias e Entrada manual.",
        noteLabel: "Observacao da carga inicial",
        notePlaceholder: "Ex.: saldo contado no inicio da operacao",
        submitLabel: "Salvar carga inicial"
      }
    : {
        eyebrow: "Estoque central",
        title: "Entrada manual",
        subtitle: "Use quando novas mercadorias entrarem no estoque central no dia a dia.",
        bannerMessage: "Use quando novas mercadorias entrarem no estoque central.",
        noteLabel: "Observacao da entrada",
        notePlaceholder: "Ex.: mercadoria recebida do fornecedor",
        submitLabel: "Salvar entrada manual"
      };

  if (productsQuery.isPending || (isInitialLoad && overviewQuery.isPending)) {
    return <PageLoader label="Carregando estoque..." />;
  }

  if (productsQuery.isError || (isInitialLoad && overviewQuery.isError)) {
    return (
      <EmptyState
        title="Nao foi possivel abrir o lancamento"
        message="Confira a conexao com o backend e tente novamente."
      />
    );
  }

  const products = productsQuery.data ?? [];
  const canUseInitialLoad = overviewQuery.data?.summary.canUseInitialLoad ?? true;

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          subtitle={pageCopy.subtitle}
        />
        <EmptyState
          title="Cadastre produtos primeiro"
          message="O estoque central depende da base de produtos. Depois do cadastro, volte aqui para lancar as quantidades."
          action={
            <Link to="/products">
              <Button>Ir para produtos</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isInitialLoad && !canUseInitialLoad) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          subtitle="A carga inicial ja foi encerrada para esta operacao."
        />
        <Card className="space-y-4">
          <WarningBanner message="A carga inicial so pode ser usada no comeco da operacao. A partir de agora, use Entrada manual para novas mercadorias." />
          <div className="grid gap-3">
            <Link to="/stock/manual-entry">
              <Button className="w-full">Ir para entrada manual</Button>
            </Link>
            <Link to="/stock">
              <Button variant="secondary" className="w-full">Voltar para o estoque</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const mutationError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={pageCopy.eyebrow}
        title={pageCopy.title}
        subtitle={pageCopy.subtitle}
      />

      <Card className="space-y-4">
        <WarningBanner message={pageCopy.bannerMessage} />

        {mutationError || formError ? <ErrorBanner message={mutationError ?? formError ?? ""} /> : null}

        <div className="space-y-3">
          {rows.map((row, index) => {
            const blockedIds = selectedProductIds.filter((selectedId) => selectedId && selectedId !== row.productId);
            const availableProducts = products.filter((product) => !blockedIds.includes(product.id));

            return (
              <Card key={row.id} className="space-y-3 bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--jam-ink)]">Produto {index + 1}</p>
                  {rows.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-0 px-0 text-xs"
                      onClick={() => {
                        setRows((currentRows) => currentRows.filter((entry) => entry.id !== row.id));
                      }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>

                <Field label="Produto">
                  <Select
                    value={row.productId}
                    onChange={(event) => {
                      setFormError(null);
                      setRows((currentRows) =>
                        currentRows.map((entry) =>
                          entry.id === row.id ? { ...entry, productId: event.target.value } : entry
                        )
                      );
                    }}
                  >
                    <option value="">Selecione um produto</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}){product.isActive ? "" : " - inativo"}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Quantidade">
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={row.quantity}
                    onChange={(event) => {
                      setFormError(null);
                      setRows((currentRows) =>
                        currentRows.map((entry) =>
                          entry.id === row.id ? { ...entry, quantity: event.target.value } : entry
                        )
                      );
                    }}
                  />
                </Field>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full border border-dashed border-[var(--jam-border)]"
          onClick={() => {
            setRows((currentRows) => [...currentRows, createEmptyRow()]);
          }}
        >
          Adicionar outro produto
        </Button>

        <Field
          label={pageCopy.noteLabel}
          hint={isInitialLoad ? "Opcional, mas ajuda a registrar como o saldo inicial foi montado." : "Opcional, para rastrear a origem da mercadoria."}
        >
          <Textarea
            placeholder={pageCopy.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => {
              setFormError(null);
              void mutation.mutateAsync().catch((error: unknown) => {
                if (error instanceof Error && !(error instanceof ApiError)) {
                  setFormError(error.message);
                }
              });
            }}
          >
            {mutation.isPending ? "Salvando..." : pageCopy.submitLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function buildBatchItems(rows: StockBatchRow[]) {
  const items = rows
    .map((row) => ({
      productId: row.productId,
      quantity: row.quantity.trim()
    }))
    .filter((row) => row.productId || row.quantity.length > 0);

  for (const item of items) {
    if (!item.productId) {
      throw new Error("Selecione o produto em todas as linhas preenchidas.");
    }

    if (!/^\d+$/.test(item.quantity) || Number(item.quantity) <= 0) {
      throw new Error("Informe quantidades inteiras maiores que zero para cada produto preenchido.");
    }
  }

  const uniqueProductIds = new Set<string>();

  for (const item of items) {
    if (uniqueProductIds.has(item.productId)) {
      throw new Error("Nao repita o mesmo produto no mesmo lancamento.");
    }

    uniqueProductIds.add(item.productId);
  }

  return items.map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity)
  }));
}

function createEmptyRow(): StockBatchRow {
  return {
    id: window.crypto.randomUUID(),
    productId: "",
    quantity: ""
  };
}
