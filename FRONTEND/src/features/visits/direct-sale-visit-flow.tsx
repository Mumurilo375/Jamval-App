import { type Dispatch, type ReactNode, type SetStateAction, useDeferredValue, useMemo, useState } from "react";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import {
  Button,
  Card,
  DrawerPanel,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  ToneBadge
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Product, VisitDetail } from "../../types/domain";
import { listProducts } from "../products/products-api";
import { VisitReceiptCard } from "./visit-receipt-card";
import { bulkUpsertVisitItems, cancelVisit, completeVisit, deleteVisitItem, updateVisit } from "./visits-api";
import { parseDecimalInput, visitNumber, visitStatusLabel, visitStatusTone } from "./visit-utils";

const paymentMethods = ["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"] as const;

type DirectSaleVisitFlowProps = {
  visit: VisitDetail;
  clientName: string;
};

type SalePaymentStatus = "PAID_TOTAL" | "PAID_PARTIAL" | "PENDING";

type SaleRowDraft = {
  itemId: string | null;
  productId: string;
  productName: string;
  productSku: string;
  quantityInput: string;
  unitPriceInput: string;
  originalQuantity: number | null;
  originalUnitPrice: number | null;
};

type SaleRowView = {
  row: SaleRowDraft;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  hasChanges: boolean;
  errors: string[];
};

type RemovedItem = {
  itemId: string;
  productId: string;
};

export function DirectSaleVisitFlow({ visit, clientName }: DirectSaleVisitFlowProps) {
  return <DirectSaleVisitFlowContent key={`${visit.id}:${visit.updatedAt}`} visit={visit} clientName={clientName} />;
}

function DirectSaleVisitFlowContent({ visit, clientName }: DirectSaleVisitFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDraft = visit.status === "DRAFT";
  const isReadOnly = !isDraft;
  const [rows, setRows] = useState<SaleRowDraft[]>(() => buildSaleRows(visit));
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [receivedAmountInput, setReceivedAmountInput] = useState(String(visitNumber(visit.receivedAmountOnVisit)));
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>(() => inferPaymentStatus(visit.receivedAmountOnVisit, visit.totalAmount));
  const [visitNotesInput, setVisitNotesInput] = useState(visit.notes ?? "");
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchInput.trim());

  const productsQuery = useQuery({
    queryKey: ["products", "direct-sale-search", deferredSearch],
    queryFn: () => listProducts({ search: deferredSearch, isActive: true }),
    enabled: Boolean(isDraft && deferredSearch.length >= 2)
  });

  const rowViews = useMemo(() => rows.map((row) => buildSaleRowView(row)), [rows]);
  const totalAmount = useMemo(() => Number(rowViews.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2)), [rowViews]);
  const effectiveReceivedAmount = useMemo(() => {
    if (paymentStatus === "PAID_TOTAL") {
      return totalAmount;
    }

    if (paymentStatus === "PENDING") {
      return 0;
    }

    const parsed = parseMoneyInput(receivedAmountInput);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }, [paymentStatus, receivedAmountInput, totalAmount]);
  const pendingAmount = useMemo(() => {
    const received = Number.isNaN(effectiveReceivedAmount) ? 0 : effectiveReceivedAmount;
    return Number(Math.max(totalAmount - received, 0).toFixed(2));
  }, [effectiveReceivedAmount, totalAmount]);
  const paymentError = buildPaymentError(paymentStatus, effectiveReceivedAmount, totalAmount);
  const itemsHaveChanges = rowViews.some((row) => row.hasChanges);
  const rowErrors = rowViews.flatMap((row) => row.errors);
  const metadataHasChanges =
    normalizeMoneyValue(Number.isNaN(effectiveReceivedAmount) ? 0 : effectiveReceivedAmount) !== normalizeMoneyValue(visitNumber(visit.receivedAmountOnVisit)) ||
    visitNotesInput !== (visit.notes ?? "");

  const availableProductIds = useMemo(() => new Set(rows.map((row) => row.productId)), [rows]);
  const searchResults = useMemo(
    () => (productsQuery.data ?? []).filter((product) => !availableProductIds.has(product.id)).slice(0, 8),
    [availableProductIds, productsQuery.data]
  );

  const saveItemsMutation = useMutation({
    mutationFn: (items: Parameters<typeof bulkUpsertVisitItems>[1]) => bulkUpsertVisitItems(visit.id, items),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const saveMetadataMutation = useMutation({
    mutationFn: (payload: { receivedAmountOnVisit: number; notes: string }) => updateVisit(visit.id, payload),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const deleteItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => deleteVisitItem(visit.id, itemId),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelVisit(visit.id),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const completeMutation = useMutation({
    mutationFn: (initialPayment?: Parameters<typeof completeVisit>[1]) => completeVisit(visit.id, initialPayment),
    onSuccess: async (nextVisit) => {
      await handleVisitMutationSuccess(queryClient)(nextVisit);
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    }
  });

  const onConfirmPaymentAndConclude = async () => {
    if (!paymentMethod) {
      return;
    }

    if (!window.confirm("Confirmar conclusao da venda?")) {
      return;
    }

    await completeMutation.mutateAsync({
      paymentMethod: paymentMethod as (typeof paymentMethods)[number],
      reference: paymentReference.trim() || undefined,
      notes: paymentNotes.trim() || undefined
    });
  };

  const saveDraft = async () => {
    setValidationError(null);

    if (rowErrors.length > 0) {
      setValidationError("Revise a venda antes de salvar. Existem linhas com quantidade ou preco invalidos.");
      return false;
    }

    if (paymentError) {
      setValidationError(paymentError);
      return false;
    }

    try {
      for (const removedItem of removedItems) {
        await deleteItemMutation.mutateAsync({ itemId: removedItem.itemId });
      }

      if (rows.length > 0 && (itemsHaveChanges || removedItems.length > 0)) {
        await saveItemsMutation.mutateAsync(
          rowViews.map((row) => ({
            productId: row.row.productId,
            clientProductId: null,
            quantityPrevious: row.quantity,
            quantityGoodRemaining: 0,
            quantityDefectiveReturn: 0,
            quantityLoss: 0,
            unitPrice: row.unitPrice,
            suggestedRestockQuantity: 0,
            restockedQuantity: 0
          }))
        );
      }

      if (metadataHasChanges) {
        await saveMetadataMutation.mutateAsync({
          receivedAmountOnVisit: normalizeMoneyValue(Number.isNaN(effectiveReceivedAmount) ? 0 : effectiveReceivedAmount),
          notes: visitNotesInput.trim()
        });
      }
    } catch {
      return false;
    }

    return true;
  };

  const onConclude = async () => {
    const saved = await saveDraft();

    if (!saved) {
      return;
    }

    if (rows.length === 0) {
      setValidationError("Adicione pelo menos um produto para concluir a venda.");
      return;
    }

    if (normalizeMoneyValue(effectiveReceivedAmount) > 0) {
      setIsPaymentDrawerOpen(true);
      return;
    }

    if (!window.confirm("Concluir esta venda agora?")) {
      return;
    }

    await completeMutation.mutateAsync(undefined);
  };

  const productSearchHelp = !isDraft
    ? null
    : deferredSearch.length < 2
      ? "Digite pelo menos 2 letras para buscar por nome ou SKU."
      : productsQuery.isPending
        ? "Buscando produtos..."
        : searchResults.length === 0
          ? "Nenhum produto disponivel para essa busca."
          : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Venda direta"
        title={clientName}
        subtitle={`${visit.visitCode} · ${formatDate(visit.visitedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ToneBadge label="Venda" tone="neutral" />
            <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
          </div>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCell label="Data da venda" value={formatDate(visit.visitedAt)} />
          <MetricCell label="Itens" value={String(rows.length)} />
          <MetricCell label="Total da venda" value={formatCurrency(totalAmount)} emphasize />
        </div>

        {isDraft ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--jam-subtle)]">Fluxo enxuto: montar a venda primeiro e fechar o pagamento no final.</p>
            <Link to={`/visits/${visit.id}/edit`}>
              <Button variant="secondary" className="w-full sm:w-auto">Editar dados da visita</Button>
            </Link>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <StepHeader step="Etapa 1" title="Montar venda" subtitle="Produto, quantidade, preco e subtotal. Sem base anterior e sem reposicao." />

        {isDraft ? (
          <div className="space-y-2">
            <Field label="Busca rapida de produto">
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nome ou SKU" />
            </Field>
            {productSearchHelp ? <p className="text-sm text-[var(--jam-subtle)]">{productSearchHelp}</p> : null}
            {searchResults.length > 0 ? (
              <div className="space-y-2 rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] p-3">
                {searchResults.map((product) => (
                  <button key={product.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={() => addProductRow(product, setRows, setRemovedItems, setSearchInput)}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{product.name}</p>
                      <p className="truncate text-xs text-[var(--jam-subtle)]">{product.sku}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[var(--jam-ink)]">{formatCurrency(product.basePrice)}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState title="Nenhum produto na venda" message="Adicione produtos para montar a venda direta." />
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_100px_120px_120px_92px] gap-3 border-b border-[var(--jam-border)] px-1 pb-2 sm:grid">
              <ColumnLabel>Produto</ColumnLabel>
              <ColumnLabel>Quantidade</ColumnLabel>
              <ColumnLabel>Preco</ColumnLabel>
              <ColumnLabel>Subtotal</ColumnLabel>
              <ColumnLabel className="text-right">Acao</ColumnLabel>
            </div>
            {rowViews.map((rowView) => (
              <div key={rowView.row.productId} className="rounded-2xl border border-[var(--jam-border)] bg-white p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_100px_120px_120px_92px] sm:items-center">
                  <DataCell label="Produto">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{rowView.row.productName}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--jam-subtle)]">{rowView.row.productSku}</p>
                    </div>
                  </DataCell>
                  <DataCell label="Quantidade">
                    <Input value={rowView.row.quantityInput} inputMode="numeric" disabled={isReadOnly} onChange={(event) => updateRow(rowView.row.productId, "quantityInput", event.target.value, setRows)} className="text-right" />
                  </DataCell>
                  <DataCell label="Preco">
                    <Input value={rowView.row.unitPriceInput} inputMode="decimal" disabled={isReadOnly} onChange={(event) => updateRow(rowView.row.productId, "unitPriceInput", event.target.value, setRows)} className="text-right" />
                  </DataCell>
                  <DataCell label="Subtotal">
                    <ReadonlyValue value={formatCurrency(rowView.subtotal)} emphasize />
                  </DataCell>
                  <div className="space-y-1 sm:text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)] sm:hidden">Acao</span>
                    {isDraft ? (
                      <Button type="button" variant="danger" className="w-full sm:w-auto" onClick={() => removeRow(rowView.row, setRows, setRemovedItems)}>
                        Remover
                      </Button>
                    ) : (
                      <ToneBadge label="Fechada" tone="neutral" />
                    )}
                  </div>
                </div>
                {rowView.errors.length > 0 ? <p className="mt-3 text-sm font-medium text-[var(--jam-danger)]">{rowView.errors.join(" ")}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <StepHeader step="Etapa 2" title="Pagamento e fechamento" subtitle="Escolha o status do recebimento e veja total, recebido e saldo." />
        <div className="grid gap-2 sm:grid-cols-3">
          {paymentOptions.map((option) => (
            <button key={option.value} type="button" disabled={isReadOnly} onClick={() => selectPaymentStatus(option.value, totalAmount, effectiveReceivedAmount, setPaymentStatus, setReceivedAmountInput)} className={cx("rounded-xl border px-3 py-2 text-left text-sm font-semibold transition", paymentStatus === option.value ? "border-[var(--jam-accent)] bg-[var(--jam-accent)] text-white" : "border-[var(--jam-border)] bg-white text-[var(--jam-ink)]", isReadOnly ? "cursor-default opacity-80" : null)}>
              {option.label}
            </button>
          ))}
        </div>

        {paymentStatus === "PAID_PARTIAL" ? (
          <div className="max-w-md">
            <Field label="Valor recebido agora" error={paymentError ?? undefined}>
              <Input value={receivedAmountInput} inputMode="decimal" disabled={isReadOnly} onChange={(event) => setReceivedAmountInput(event.target.value)} placeholder="0,00" />
            </Field>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCell label="Total" value={formatCurrency(totalAmount)} emphasize />
          <MetricCell label="Recebido" value={formatCurrency(Number.isNaN(effectiveReceivedAmount) ? 0 : effectiveReceivedAmount)} />
          <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
        </div>

        {validationError ? <ErrorBanner message={validationError} /> : null}
        {saveItemsMutation.error instanceof ApiError ? <ErrorBanner message={saveItemsMutation.error.message} /> : null}
        {saveMetadataMutation.error instanceof ApiError ? <ErrorBanner message={saveMetadataMutation.error.message} /> : null}
        {deleteItemMutation.error instanceof ApiError ? <ErrorBanner message={deleteItemMutation.error.message} /> : null}
        {completeMutation.error instanceof ApiError ? <ErrorBanner message={completeMutation.error.message} /> : null}

        {isDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => void saveDraft()} disabled={saveItemsMutation.isPending || saveMetadataMutation.isPending || deleteItemMutation.isPending}>Salvar visita</Button>
            <Button onClick={() => void onConclude()} disabled={completeMutation.isPending || rows.length === 0}>Concluir venda</Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">{visit.status === "COMPLETED" ? "A venda foi concluida e ficou apenas para leitura." : "A venda foi cancelada e ficou apenas para consulta."}</p>
        )}
      </Card>

      {visit.status === "COMPLETED" ? <VisitReceiptCard visit={visit} /> : null}

      <Card className="space-y-4">
        <StepHeader step="Observacoes" title="Observacoes da venda" />
        {isDraft ? (
          <Field label="Anotacoes gerais">
            <Textarea value={visitNotesInput} rows={4} onChange={(event) => setVisitNotesInput(event.target.value)} placeholder="Observacoes opcionais da venda" />
          </Field>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">{visit.notes || "Sem observacoes registradas."}</p>
        )}
      </Card>

      {isDraft ? (
        <Card className="space-y-3">
          <StepHeader step="Nao finalizada" title="Acoes da venda" />
          <Button variant="danger" className="w-full" disabled={cancelMutation.isPending} onClick={() => { if (window.confirm("Cancelar esta venda nao finalizada?")) { void cancelMutation.mutateAsync().then(() => navigate("/visits", { replace: true })); } }}>
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar venda"}
          </Button>
        </Card>
      ) : null}

      <DrawerPanel open={isPaymentDrawerOpen} onClose={() => setIsPaymentDrawerOpen(false)} title="Forma de pagamento" description="Como houve valor recebido, confirme o pagamento inicial antes de concluir a venda." footer={<div className="grid gap-3 sm:grid-cols-2"><Button variant="ghost" onClick={() => setIsPaymentDrawerOpen(false)} disabled={completeMutation.isPending}>Voltar</Button><Button onClick={() => void onConfirmPaymentAndConclude()} disabled={completeMutation.isPending || !paymentMethod}>{completeMutation.isPending ? "Concluindo..." : "Confirmar conclusao"}</Button></div>}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCell label="Total" value={formatCurrency(totalAmount)} />
            <MetricCell label="Recebido" value={formatCurrency(Number.isNaN(effectiveReceivedAmount) ? 0 : effectiveReceivedAmount)} />
            <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
          </div>
          <Field label="Forma de pagamento">
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="">Selecione</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{formatPaymentMethod(method)}</option>)}
            </Select>
          </Field>
          <Field label="Referencia">
            <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="PIX, dinheiro, maquina, banco" />
          </Field>
          <Field label="Observacoes">
            <Textarea value={paymentNotes} rows={4} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Observacoes do pagamento inicial" />
          </Field>
        </div>
      </DrawerPanel>
    </div>
  );
}

const paymentOptions: Array<{ value: SalePaymentStatus; label: string }> = [
  { value: "PAID_TOTAL", label: "Pago total" },
  { value: "PAID_PARTIAL", label: "Pago parcial" },
  { value: "PENDING", label: "Pendente" }
];

function buildSaleRows(visit: VisitDetail): SaleRowDraft[] {
  return visit.items.map((item) => ({
    itemId: item.id,
    productId: item.productId,
    productName: item.productSnapshotName,
    productSku: item.productSnapshotSku,
    quantityInput: String(item.quantitySold > 0 ? item.quantitySold : item.quantityPrevious),
    unitPriceInput: String(visitNumber(item.unitPrice)),
    originalQuantity: item.quantitySold > 0 ? item.quantitySold : item.quantityPrevious,
    originalUnitPrice: visitNumber(item.unitPrice)
  }));
}

function buildSaleRowView(row: SaleRowDraft): SaleRowView {
  const quantity = parseSaleQuantity(row.quantityInput);
  const unitPrice = parseMoneyInput(row.unitPriceInput);
  const errors: string[] = [];
  if (!Number.isInteger(quantity) || quantity <= 0) {
    errors.push("Quantidade precisa ser um inteiro maior que zero.");
  }
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    errors.push("Preco precisa ser valido.");
  }
  const safeQuantity = Number.isNaN(quantity) ? 0 : quantity;
  const safeUnitPrice = Number.isNaN(unitPrice) ? 0 : unitPrice;

  return {
    row,
    quantity: safeQuantity,
    unitPrice: safeUnitPrice,
    subtotal: Number((safeQuantity * safeUnitPrice).toFixed(2)),
    hasChanges:
      row.itemId === null ||
      row.originalQuantity !== safeQuantity ||
      normalizeMoneyValue(row.originalUnitPrice ?? 0) !== normalizeMoneyValue(safeUnitPrice),
    errors
  };
}

function parseSaleQuantity(value: string): number {
  if (value.trim() === "") {
    return Number.NaN;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function parseMoneyInput(value: string): number {
  if (value.trim() === "") {
    return Number.NaN;
  }
  return parseDecimalInput(value);
}

function inferPaymentStatus(receivedAmount: number | string, totalAmount: number | string): SalePaymentStatus {
  const received = normalizeMoneyValue(visitNumber(receivedAmount));
  const total = normalizeMoneyValue(visitNumber(totalAmount));
  if (received === 0) {
    return "PENDING";
  }
  if (total > 0 && received >= total) {
    return "PAID_TOTAL";
  }
  return "PAID_PARTIAL";
}

function buildPaymentError(status: SalePaymentStatus, receivedAmount: number, totalAmount: number): string | null {
  if (status !== "PAID_PARTIAL") {
    return null;
  }
  if (Number.isNaN(receivedAmount) || receivedAmount <= 0) {
    return "Informe um valor recebido valido para pagamento parcial.";
  }
  if (receivedAmount >= totalAmount) {
    return "No pagamento parcial, o valor recebido precisa ser menor que o total.";
  }
  return null;
}

function normalizeMoneyValue(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function formatMoneyInput(value: number): string {
  return value === 0 ? "0" : value.toFixed(2).replace(/\.00$/, "");
}

function addProductRow(product: Product, setRows: Dispatch<SetStateAction<SaleRowDraft[]>>, setRemovedItems: Dispatch<SetStateAction<RemovedItem[]>>, setSearchInput: Dispatch<SetStateAction<string>>) {
  setRows((current) => [...current, { itemId: null, productId: product.id, productName: product.name, productSku: product.sku, quantityInput: "1", unitPriceInput: String(product.basePrice), originalQuantity: null, originalUnitPrice: null }]);
  setRemovedItems((current) => current.filter((entry) => entry.productId !== product.id));
  setSearchInput("");
}

function removeRow(row: SaleRowDraft, setRows: Dispatch<SetStateAction<SaleRowDraft[]>>, setRemovedItems: Dispatch<SetStateAction<RemovedItem[]>>) {
  setRows((current) => current.filter((entry) => entry.productId !== row.productId));
  if (row.itemId) {
    setRemovedItems((current) => [...current.filter((entry) => entry.itemId !== row.itemId), { itemId: row.itemId!, productId: row.productId }]);
  }
}

function updateRow(productId: string, field: "quantityInput" | "unitPriceInput", value: string, setRows: Dispatch<SetStateAction<SaleRowDraft[]>>) {
  setRows((current) => current.map((row) => row.productId === productId ? { ...row, [field]: value } : row));
}

function selectPaymentStatus(status: SalePaymentStatus, totalAmount: number, receivedAmount: number, setPaymentStatus: Dispatch<SetStateAction<SalePaymentStatus>>, setReceivedAmountInput: Dispatch<SetStateAction<string>>) {
  setPaymentStatus(status);
  if (status === "PAID_TOTAL") {
    setReceivedAmountInput(formatMoneyInput(totalAmount));
  } else if (status === "PENDING") {
    setReceivedAmountInput("0");
  } else if (!(receivedAmount > 0 && receivedAmount < totalAmount)) {
    setReceivedAmountInput("");
  }
}

function handleVisitMutationSuccess(queryClient: QueryClient) {
  return async (nextVisit: VisitDetail) => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
    queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
  };
}

function formatPaymentMethod(method: (typeof paymentMethods)[number]) {
  if (method === "BANK_TRANSFER") return "Transferencia";
  if (method === "CASH") return "Dinheiro";
  if (method === "CARD") return "Cartao";
  if (method === "PIX") return "PIX";
  return "Outro";
}

function StepHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">{step}</p><h2 className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}</div>;
}

function MetricCell({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return <div className={cx("rounded-xl p-3", emphasize ? "bg-[rgba(29,78,216,0.08)]" : "bg-white")}><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p></div>;
}

function ColumnLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]", className)}>{children}</p>;
}

function DataCell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)] sm:hidden">{label}</p>{children}</div>;
}

function ReadonlyValue({ value, emphasize = false }: { value: string; emphasize?: boolean }) {
  return <div className={cx("flex min-h-10 items-center rounded-xl border border-[var(--jam-border)] px-3 text-right text-sm font-medium text-[var(--jam-ink)]", emphasize ? "bg-[var(--jam-panel-strong)]" : "bg-white")}><span className="w-full truncate">{value}</span></div>;
}
