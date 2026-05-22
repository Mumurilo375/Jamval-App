import { type Dispatch, type ReactNode, type SetStateAction, useDeferredValue, useEffect, useMemo, useState } from "react";
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
  MoneyInput,
  PageHeader,
  Select,
  StickyActionBar,
  Textarea,
  ToneBadge,
  WarningBanner
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
  backTo: string;
  backLabel: string;
};

type SalePendingAction = "CONCLUDE" | "CANCEL" | null;

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

export function DirectSaleVisitFlow({ visit, clientName, backTo, backLabel }: DirectSaleVisitFlowProps) {
  return <DirectSaleVisitFlowContent key={visit.id} visit={visit} clientName={clientName} backTo={backTo} backLabel={backLabel} />;
}

function DirectSaleVisitFlowContent({ visit, clientName, backTo, backLabel }: DirectSaleVisitFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDraft = visit.status === "DRAFT";
  const isReadOnly = !isDraft;
  const [rows, setRows] = useState<SaleRowDraft[]>(() => buildSaleRows(visit));
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [savedReceivedAmount, setSavedReceivedAmount] = useState(() => visitNumber(visit.receivedAmountOnVisit));
  const [savedNotes, setSavedNotes] = useState(visit.notes ?? "");
  const [receivedAmountInput, setReceivedAmountInput] = useState(() =>
    visitNumber(visit.receivedAmountOnVisit) > 0 ? String(visitNumber(visit.receivedAmountOnVisit)) : ""
  );
  const [visitNotesInput, setVisitNotesInput] = useState(visit.notes ?? "");
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<SalePendingAction>(null);
  const deferredSearch = useDeferredValue(searchInput.trim());

  const productsQuery = useQuery({
    queryKey: ["products", "direct-sale-search", deferredSearch],
    queryFn: () => listProducts({ search: deferredSearch, isActive: true }),
    enabled: Boolean(isDraft && deferredSearch.length >= 2)
  });

  const rowViews = useMemo(() => rows.map((row) => buildSaleRowView(row)), [rows]);
  const totalAmount = useMemo(() => Number(rowViews.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2)), [rowViews]);
  const receivedAmountValue = useMemo(() => parseMoneyInput(receivedAmountInput), [receivedAmountInput]);
  const safeReceivedAmount = useMemo(
    () => (Number.isNaN(receivedAmountValue) ? 0 : receivedAmountValue),
    [receivedAmountValue]
  );
  const pendingAmount = useMemo(() => {
    return Number(Math.max(totalAmount - safeReceivedAmount, 0).toFixed(2));
  }, [safeReceivedAmount, totalAmount]);
  const paymentError = buildReceivedAmountError(receivedAmountInput, receivedAmountValue, totalAmount);
  const itemsHaveChanges = rowViews.some((row) => row.hasChanges);
  const rowErrors = rowViews.flatMap((row) => row.errors);
  const metadataHasChanges =
    normalizeMoneyValue(safeReceivedAmount) !== normalizeMoneyValue(savedReceivedAmount) ||
    visitNotesInput !== savedNotes;
  const hasUnsavedChanges = itemsHaveChanges || removedItems.length > 0 || metadataHasChanges;

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
  const saveBusy = saveItemsMutation.isPending || saveMetadataMutation.isPending || deleteItemMutation.isPending;

  useEffect(() => {
    if (!hasUnsavedChanges || isReadOnly) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges, isReadOnly]);

  const onConfirmPaymentAndConclude = async () => {
    if (!paymentMethods.some((method) => method === paymentMethod)) {
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
      setValidationError("Revise a venda antes de salvar. Existem linhas com quantidade ou preço inválidos.");
      return false;
    }

    if (paymentError) {
      setValidationError(paymentError);
      return false;
    }

    try {
      let latestVisit: VisitDetail | null = null;

      for (const removedItem of removedItems) {
        latestVisit = await deleteItemMutation.mutateAsync({ itemId: removedItem.itemId });
      }

      if (rows.length > 0 && (itemsHaveChanges || removedItems.length > 0)) {
        latestVisit = await saveItemsMutation.mutateAsync(
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
        const trimmedNotes = visitNotesInput.trim();
        latestVisit = await saveMetadataMutation.mutateAsync({
          receivedAmountOnVisit: normalizeMoneyValue(safeReceivedAmount),
          notes: trimmedNotes
        });
        setVisitNotesInput(trimmedNotes);
      }

      if (latestVisit) {
        setRows(buildSaleRows(latestVisit));
        setRemovedItems([]);
        setSavedReceivedAmount(visitNumber(latestVisit.receivedAmountOnVisit));
        setSavedNotes(latestVisit.notes ?? "");
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

    if (normalizeMoneyValue(safeReceivedAmount) > 0) {
      setIsPaymentDrawerOpen(true);
      return;
    }

    setPendingAction("CONCLUDE");
  };

  const onConfirmPendingAction = async () => {
    const action = pendingAction;
    setPendingAction(null);

    if (action === "CONCLUDE") {
      await completeMutation.mutateAsync(undefined);
      return;
    }

    if (action === "CANCEL") {
      await cancelMutation.mutateAsync();
      navigate("/visits", { replace: true });
    }
  };

  const productSearchHelp = !isDraft
    ? null
    : deferredSearch.length < 2
      ? "Digite pelo menos 2 letras para buscar por nome ou SKU."
      : productsQuery.isPending
        ? "Buscando produtos..."
        : searchResults.length === 0
          ? "Nenhum produto disponível para essa busca."
          : null;

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={backTo}
        backLabel={backLabel}
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
            <p className="text-sm text-[var(--jam-subtle)]">
              Saldo atual: <span className="font-semibold text-[var(--jam-ink)]">{formatCurrency(pendingAmount)}</span>
            </p>
            <Link to={`/visits/${visit.id}/edit`}>
              <Button variant="secondary" className="w-full sm:w-auto">Editar dados da visita</Button>
            </Link>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <StepHeader step="Etapa 1" title="Montar venda" subtitle="Produto, quantidade, preço e subtotal." />

        {isDraft ? (
          <div className="space-y-2">
            <Field label="Busca rapida de produto">
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nome ou SKU" autoComplete="off" />
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
              <ColumnLabel>Preço</ColumnLabel>
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
                    <QuantityControl
                      value={rowView.row.quantityInput}
                      disabled={isReadOnly}
                      onChange={(value) => updateRow(rowView.row.productId, "quantityInput", value, setRows)}
                      onStep={(delta) => stepQuantity(rowView.row.productId, delta, setRows)}
                    />
                  </DataCell>
                  <DataCell label="Preço">
                    <MoneyInput value={rowView.row.unitPriceInput} disabled={isReadOnly} onChange={(event) => updateRow(rowView.row.productId, "unitPriceInput", event.target.value, setRows)} />
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
        <StepHeader
          step="Etapa 2"
          title="Pagamento e fechamento"
        />

        {isDraft ? (
          <div className="max-w-md">
            <Field label="Valor recebido agora" error={paymentError ?? undefined}>
              <MoneyInput value={receivedAmountInput} disabled={isReadOnly} onChange={(event) => setReceivedAmountInput(event.target.value)} placeholder="0,00" />
            </Field>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCell label="Total" value={formatCurrency(totalAmount)} emphasize />
          <MetricCell label="Recebido" value={formatCurrency(safeReceivedAmount)} />
          <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
        </div>

        <p className="text-sm font-medium text-[var(--jam-subtle)]">
          Situacao: {describePaymentStatus(safeReceivedAmount, totalAmount)}
        </p>

        {isDraft && hasUnsavedChanges ? (
          <WarningBanner message="Existem alterações ainda não salvas nesta venda." />
        ) : null}

        {validationError ? <ErrorBanner message={validationError} /> : null}
        {saveItemsMutation.error instanceof ApiError ? <ErrorBanner message={formatApiErrorMessage(saveItemsMutation.error)} /> : null}
        {saveMetadataMutation.error instanceof ApiError ? <ErrorBanner message={formatApiErrorMessage(saveMetadataMutation.error)} /> : null}
        {deleteItemMutation.error instanceof ApiError ? <ErrorBanner message={formatApiErrorMessage(deleteItemMutation.error)} /> : null}
        {completeMutation.error instanceof ApiError ? <ErrorBanner message={formatApiErrorMessage(completeMutation.error)} /> : null}

        {!isDraft ? (
          <p className="text-sm text-[var(--jam-subtle)]">{visit.status === "COMPLETED" ? "A venda foi concluída e ficou apenas para leitura." : "A venda foi cancelada e ficou apenas para consulta."}</p>
        ) : null}
      </Card>

      {visit.status === "COMPLETED" ? <VisitReceiptCard visit={visit} /> : null}

      <Card className="space-y-4">
        <StepHeader step="Observações" title="Observações da venda" />
        {isDraft ? (
          <Field label="Anotações gerais">
            <Textarea
              value={visitNotesInput}
              rows={4}
              maxLength={2000}
              onChange={(event) => setVisitNotesInput(event.target.value)}
              placeholder="Observações opcionais da venda"
            />
          </Field>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">{visit.notes || "Sem observações registradas."}</p>
        )}
      </Card>

      {isDraft ? (
        <Card className="space-y-3">
          <StepHeader step="Não finalizada" title="Ações da venda" />
          <Button variant="danger" className="w-full" disabled={cancelMutation.isPending} onClick={() => setPendingAction("CANCEL")}>
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar venda"}
          </Button>
        </Card>
      ) : null}

      {isDraft ? (
        <StickyActionBar>
          <div className="min-w-0 rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] px-3 py-2 sm:mr-auto">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Resumo</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--jam-ink)]">
              {formatCurrency(totalAmount)} total • {formatCurrency(pendingAmount)} saldo
            </p>
          </div>
          <Button variant="secondary" onClick={() => void saveDraft()} disabled={saveBusy || !hasUnsavedChanges}>
            {saveBusy ? "Salvando..." : hasUnsavedChanges ? "Salvar rascunho" : "Tudo salvo"}
          </Button>
          <Button onClick={() => void onConclude()} disabled={saveBusy || completeMutation.isPending || rows.length === 0}>
            {saveBusy ? "Salvando..." : completeMutation.isPending ? "Concluindo..." : "Concluir venda"}
          </Button>
        </StickyActionBar>
      ) : null}

      <DrawerPanel open={isPaymentDrawerOpen} onClose={() => setIsPaymentDrawerOpen(false)} title="Forma de pagamento" description="Como houve valor recebido, confirme o pagamento inicial antes de concluir a venda." footer={<div className="grid gap-3 sm:grid-cols-2"><Button variant="ghost" onClick={() => setIsPaymentDrawerOpen(false)} disabled={completeMutation.isPending}>Voltar</Button><Button onClick={() => void onConfirmPaymentAndConclude()} disabled={completeMutation.isPending || !paymentMethod}>{completeMutation.isPending ? "Concluindo..." : "Confirmar conclusão"}</Button></div>}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCell label="Total" value={formatCurrency(totalAmount)} />
            <MetricCell label="Recebido" value={formatCurrency(safeReceivedAmount)} />
            <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
          </div>
          <Field label="Forma de pagamento">
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="">Selecione</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{formatPaymentMethod(method)}</option>)}
            </Select>
          </Field>
          <Field label="Referência">
            <Input
              value={paymentReference}
              maxLength={160}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="PIX, dinheiro, máquina, banco"
            />
          </Field>
          <Field label="Observações">
            <Textarea
              value={paymentNotes}
              rows={4}
              maxLength={2000}
              onChange={(event) => setPaymentNotes(event.target.value)}
              placeholder="Observações do pagamento inicial"
            />
          </Field>
        </div>
      </DrawerPanel>

      <DrawerPanel
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={pendingAction === "CANCEL" ? "Cancelar venda" : "Concluir venda"}
        description={
          pendingAction === "CANCEL"
            ? "Essa venda não finalizada será cancelada e vai sair da sua fila de trabalho."
            : "Depois de concluir, a venda fica somente para leitura e entra no fluxo financeiro."
        }
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => setPendingAction(null)} disabled={completeMutation.isPending || cancelMutation.isPending}>
              Voltar
            </Button>
            <Button
              variant={pendingAction === "CANCEL" ? "danger" : "primary"}
              onClick={() => void onConfirmPendingAction()}
              disabled={completeMutation.isPending || cancelMutation.isPending}
            >
              {pendingAction === "CANCEL"
                ? cancelMutation.isPending
                  ? "Cancelando..."
                  : "Confirmar cancelamento"
                : completeMutation.isPending
                  ? "Concluindo..."
                  : "Confirmar conclusão"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {pendingAction === "CONCLUDE" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCell label="Total" value={formatCurrency(totalAmount)} />
              <MetricCell label="Recebido" value={formatCurrency(safeReceivedAmount)} />
              <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
            </div>
          ) : (
            <p className="text-sm text-[var(--jam-subtle)]">
              Se você ainda precisar revisar itens ou pagamento, volte agora antes de cancelar.
            </p>
          )}
        </div>
      </DrawerPanel>
    </div>
  );
}

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
    errors.push("Preço precisa ser válido.");
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

function buildReceivedAmountError(inputValue: string, receivedAmount: number, totalAmount: number): string | null {
  if (inputValue.trim() === "") {
    return null;
  }
  if (Number.isNaN(receivedAmount) || receivedAmount < 0) {
    return "Informe um valor recebido válido.";
  }
  if (receivedAmount > totalAmount) {
    return "O valor recebido não pode ser maior que o total da venda.";
  }
  return null;
}

function describePaymentStatus(receivedAmount: number, totalAmount: number): string {
  if (receivedAmount <= 0) {
    return "Pendente";
  }

  if (totalAmount > 0 && receivedAmount < totalAmount) {
    return "Pago parcial";
  }

  return "Pago total";
}

function normalizeMoneyValue(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
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

function stepQuantity(productId: string, delta: number, setRows: Dispatch<SetStateAction<SaleRowDraft[]>>) {
  setRows((current) =>
    current.map((row) => {
      if (row.productId !== productId) {
        return row;
      }

      const currentQuantity = parseSaleQuantity(row.quantityInput);
      const nextQuantity = Math.max(1, (Number.isNaN(currentQuantity) ? 1 : currentQuantity) + delta);
      return { ...row, quantityInput: String(nextQuantity) };
    })
  );
}

function handleVisitMutationSuccess(queryClient: QueryClient) {
  return async (nextVisit: VisitDetail) => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
    queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
  };
}

function formatPaymentMethod(method: (typeof paymentMethods)[number]) {
  if (method === "BANK_TRANSFER") return "Transferência";
  if (method === "CASH") return "Dinheiro";
  if (method === "CARD") return "Cartão";
  if (method === "PIX") return "PIX";
  return "Outro";
}

function formatApiErrorMessage(error: ApiError) {
  if (error.code !== "INTERNAL_SERVER_ERROR") {
    return error.message;
  }

  const details = extractApiErrorDetail(error.details);

  if (details) {
    return details;
  }

  return error.message;
}

function extractApiErrorDetail(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const record = details as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message;
  }

  if (typeof record.name === "string" && record.name.trim().length > 0) {
    return record.name;
  }

  return null;
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

function QuantityControl({
  value,
  disabled,
  onChange,
  onStep
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr_36px] overflow-hidden rounded-xl border border-[var(--jam-border)] bg-white">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStep(-1)}
        className="min-h-10 border-r border-[var(--jam-border)] text-sm font-semibold text-[var(--jam-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Diminuir quantidade"
      >
        -
      </button>
      <input
        value={value}
        inputMode="numeric"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 min-w-0 bg-white px-2 text-center text-sm font-semibold text-[var(--jam-ink)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Quantidade"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStep(1)}
        className="min-h-10 border-l border-[var(--jam-border)] text-sm font-semibold text-[var(--jam-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}
