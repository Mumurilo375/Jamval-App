import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  ToneBadge,
  WarningBanner
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatCurrency, formatDate } from "../../lib/format";
import type { VisitDetail, VisitItem } from "../../types/domain";
import { listClientCatalog } from "../client-catalog/catalog-api";
import { listProducts } from "../products/products-api";
import { VisitReceiptCard } from "./visit-receipt-card";
import {
  bulkUpsertVisitItems,
  cancelVisit,
  completeVisit,
  deleteVisitItem,
  listCentralBalances,
  listCompletedVisitHistoryDetails,
  updateVisit
} from "./visits-api";
import {
  buildAutoPopulatedVisitItems,
  buildSuggestedPreviousByProductId,
  computeVisitPendingAmount,
  parseDecimalInput,
  visitNumber,
  visitStatusLabel,
  visitStatusTone
} from "./visit-utils";

const paymentMethods = ["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"] as const;

type ConsignmentVisitFlowProps = {
  visit: VisitDetail;
  clientName: string;
};

type ItemDraftState = {
  quantitySold: string;
  quantityDefectiveReturn: string;
  quantityLoss: string;
  unitPrice: string;
  restockedQuantity: string;
  notes: string;
};

type AvailableProductOption = {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  clientProductId: string | null;
  suggestedPrevious: number | null;
};

type RowViewModel = {
  item: VisitItem;
  draft: ItemDraftState;
  quantitySold: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  unitPrice: number;
  restockedQuantity: number;
  remainingQuantity: number;
  subtotalAmount: number;
  nextBaseQuantity: number;
  hasChanges: boolean;
  errors: string[];
  availableCentralQuantity: number;
  exceedsCentralStock: boolean;
};

export function ConsignmentVisitFlow({ visit, clientName }: ConsignmentVisitFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const autoPopulateAttemptedRef = useRef<string | null>(null);
  const isDraft = visit.status === "DRAFT";
  const isReadOnly = !isDraft;
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraftState>>(() => buildItemDraftMap(visit.items));
  const [receivedAmountInput, setReceivedAmountInput] = useState(String(visitNumber(visit.receivedAmountOnVisit)));
  const [visitNotesInput, setVisitNotesInput] = useState(visit.notes ?? "");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addProductPreviousInput, setAddProductPreviousInput] = useState("");
  const [addProductUnitPriceInput, setAddProductUnitPriceInput] = useState("");
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [draftValidationError, setDraftValidationError] = useState<string | null>(null);
  const [autoPopulateCount, setAutoPopulateCount] = useState(0);

  useEffect(() => {
    setItemDrafts((current) => {
      const next: Record<string, ItemDraftState> = {};

      visit.items.forEach((item) => {
        next[item.id] = current[item.id] ?? createItemDraft(item);
      });

      return next;
    });
  }, [visit.items]);

  useEffect(() => {
    setReceivedAmountInput(String(visitNumber(visit.receivedAmountOnVisit)));
    setVisitNotesInput(visit.notes ?? "");
    setDraftValidationError(null);
    setIsPaymentDrawerOpen(false);
    setPaymentMethod("");
    setPaymentReference("");
    setPaymentNotes("");
  }, [visit.id]);

  const shouldAutopopulate = Boolean(isDraft && visit.items.length === 0);
  const clientCatalogQuery = useQuery({
    queryKey: ["client-catalog", visit.clientId, "consignment-flow"],
    queryFn: () => listClientCatalog(visit.clientId, true),
    enabled: Boolean(isDraft)
  });
  const completedHistoryQuery = useQuery({
    queryKey: ["visits", visit.clientId, "completed-history-details", "consignment-flow"],
    queryFn: () => listCompletedVisitHistoryDetails(visit.clientId, 6, "CONSIGNMENT"),
    enabled: Boolean(isDraft)
  });
  const productsQuery = useQuery({
    queryKey: ["products", "consignment-flow", visit.id],
    queryFn: () => listProducts({ isActive: true }),
    enabled: isAddProductOpen
  });
  const centralBalancesQuery = useQuery({
    queryKey: ["stock", "central-balances", visit.items.map((item) => item.productId)],
    queryFn: () => listCentralBalances(visit.items.map((item) => item.productId)),
    enabled: visit.items.length > 0
  });

  const autoPopulateMutation = useMutation({
    mutationFn: (items: Parameters<typeof bulkUpsertVisitItems>[1]) => bulkUpsertVisitItems(visit.id, items),
    onSuccess: async (nextVisit) => {
      setAutoPopulateCount(nextVisit.items.length);
      await handleVisitMutationSuccess(queryClient)(nextVisit);
    }
  });
  const saveItemsMutation = useMutation({
    mutationFn: (items: Parameters<typeof bulkUpsertVisitItems>[1]) => bulkUpsertVisitItems(visit.id, items),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const saveMetadataMutation = useMutation({
    mutationFn: (payload: { receivedAmountOnVisit: number; notes: string }) => updateVisit(visit.id, payload),
    onSuccess: handleVisitMutationSuccess(queryClient)
  });
  const addProductMutation = useMutation({
    mutationFn: (payload: Parameters<typeof bulkUpsertVisitItems>[1]) => bulkUpsertVisitItems(visit.id, payload),
    onSuccess: async (nextVisit) => {
      await handleVisitMutationSuccess(queryClient)(nextVisit);
      setIsAddProductOpen(false);
      setAddProductId("");
      setAddProductPreviousInput("");
      setAddProductUnitPriceInput("");
    }
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
      setIsPaymentDrawerOpen(false);
      setPaymentMethod("");
      setPaymentReference("");
      setPaymentNotes("");
    }
  });

  const availableCentralByProductId = useMemo(
    () => Object.fromEntries((centralBalancesQuery.data ?? []).map((entry) => [entry.productId, entry.currentQuantity])),
    [centralBalancesQuery.data]
  );
  const rowViewModels = useMemo(
    () =>
      visit.items.map((item) =>
        buildRowViewModel({
          item,
          draft: itemDrafts[item.id] ?? createItemDraft(item),
          availableCentralQuantity: availableCentralByProductId[item.productId] ?? 0
        })
      ),
    [availableCentralByProductId, itemDrafts, visit.items]
  );
  const totals = useMemo(
    () =>
      rowViewModels.reduce(
        (summary, row) => {
          summary.itemCount += 1;
          summary.quantitySold += row.quantitySold;
          summary.totalAmount += row.subtotalAmount;
          summary.remainingQuantity += row.remainingQuantity;
          summary.restockedQuantity += row.restockedQuantity;
          summary.nextBaseQuantity += row.nextBaseQuantity;
          return summary;
        },
        {
          itemCount: 0,
          quantitySold: 0,
          totalAmount: 0,
          remainingQuantity: 0,
          restockedQuantity: 0,
          nextBaseQuantity: 0
        }
      ),
    [rowViewModels]
  );
  const receivedAmountValue = useMemo(() => parseMoneyInput(receivedAmountInput), [receivedAmountInput]);
  const safeReceivedAmount = Number.isNaN(receivedAmountValue) ? 0 : receivedAmountValue;
  const pendingAmount = useMemo(
    () => computeVisitPendingAmount(totals.totalAmount, safeReceivedAmount),
    [safeReceivedAmount, totals.totalAmount]
  );
  const metadataHasChanges =
    normalizeMoneyValue(receivedAmountValue) !== normalizeMoneyValue(visitNumber(visit.receivedAmountOnVisit)) ||
    visitNotesInput !== (visit.notes ?? "");
  const itemsHaveChanges = rowViewModels.some((row) => row.hasChanges);
  const rowValidationErrors = rowViewModels.flatMap((row) => row.errors);
  const receivedAmountError = buildReceivedAmountError(receivedAmountValue, totals.totalAmount);
  const stockWarnings = rowViewModels.filter((row) => row.exceedsCentralStock);
  const suggestedPreviousByProductId = useMemo(
    () => buildSuggestedPreviousByProductId(completedHistoryQuery.data ?? []),
    [completedHistoryQuery.data]
  );
  const availableProducts = useMemo<AvailableProductOption[]>(() => {
    if (!productsQuery.data) {
      return [];
    }

    const usedProductIds = new Set(visit.items.map((item) => item.productId));
    const catalogByProductId = new Map((clientCatalogQuery.data ?? []).map((entry) => [entry.productId, entry]));

    return productsQuery.data
      .filter((product) => !usedProductIds.has(product.id))
      .map((product) => {
        const catalogItem = catalogByProductId.get(product.id);
        const suggestedPrevious = suggestedPreviousByProductId[product.id];

        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice: catalogItem?.currentUnitPrice ?? product.basePrice,
          clientProductId: catalogItem?.id ?? null,
          suggestedPrevious: suggestedPrevious === undefined ? null : suggestedPrevious
        };
      });
  }, [clientCatalogQuery.data, productsQuery.data, suggestedPreviousByProductId, visit.items]);
  const selectedProductOption = useMemo(
    () => availableProducts.find((product) => product.productId === addProductId) ?? null,
    [addProductId, availableProducts]
  );

  useEffect(() => {
    if (!selectedProductOption) {
      return;
    }

    setAddProductUnitPriceInput(String(selectedProductOption.unitPrice));
    setAddProductPreviousInput(selectedProductOption.suggestedPrevious === null ? "" : String(selectedProductOption.suggestedPrevious));
  }, [selectedProductOption]);

  useEffect(() => {
    if (!shouldAutopopulate || !clientCatalogQuery.isSuccess || !completedHistoryQuery.isSuccess) {
      return;
    }

    if (autoPopulateAttemptedRef.current === visit.id) {
      return;
    }

    autoPopulateAttemptedRef.current = visit.id;

    const itemsToPopulate = buildAutoPopulatedVisitItems({
      catalogItems: clientCatalogQuery.data,
      suggestedPreviousByProductId
    });

    if (itemsToPopulate.length === 0) {
      return;
    }

    void autoPopulateMutation.mutateAsync(itemsToPopulate).catch(() => undefined);
  }, [
    autoPopulateMutation,
    clientCatalogQuery.data,
    clientCatalogQuery.isSuccess,
    completedHistoryQuery.isSuccess,
    shouldAutopopulate,
    suggestedPreviousByProductId,
    visit.id
  ]);

  const draftMutationError = resolveActiveError(
    saveItemsMutation.error,
    saveMetadataMutation.error,
    deleteItemMutation.error,
    cancelMutation.error
  );
  const saveBusy = saveItemsMutation.isPending || saveMetadataMutation.isPending;
  const isBusy =
    saveBusy ||
    autoPopulateMutation.isPending ||
    addProductMutation.isPending ||
    deleteItemMutation.isPending ||
    cancelMutation.isPending ||
    completeMutation.isPending;
  const canConclude = rowViewModels.length > 0;

  const saveDraft = async () => {
    setDraftValidationError(null);

    if (rowValidationErrors.length > 0) {
      setDraftValidationError("Revise a conferencia antes de salvar a visita. Existem produtos com saldo negativo ou campos invalidos.");
      return false;
    }

    if (receivedAmountError) {
      setDraftValidationError(receivedAmountError);
      return false;
    }

    try {
      if (itemsHaveChanges) {
        await saveItemsMutation.mutateAsync(
          rowViewModels.map((row) => ({
            productId: row.item.productId,
            clientProductId: row.item.clientProductId,
            quantityPrevious: row.item.quantityPrevious,
            quantityGoodRemaining: row.remainingQuantity,
            quantityDefectiveReturn: row.quantityDefectiveReturn,
            quantityLoss: row.quantityLoss,
            unitPrice: row.unitPrice,
            suggestedRestockQuantity: row.item.suggestedRestockQuantity,
            restockedQuantity: row.restockedQuantity,
            notes: row.draft.notes.trim() || undefined
          }))
        );
      }

      if (metadataHasChanges) {
        await saveMetadataMutation.mutateAsync({
          receivedAmountOnVisit: normalizeMoneyValue(receivedAmountValue),
          notes: visitNotesInput.trim()
        });
      }
    } catch {
      return false;
    }

    return true;
  };

  const onAddProduct = async () => {
    if (!selectedProductOption) {
      return;
    }

    const quantityPrevious = parseCountInput(addProductPreviousInput);
    const unitPrice = parseMoneyInput(addProductUnitPriceInput);

    if (Number.isNaN(quantityPrevious) || quantityPrevious < 0) {
      return;
    }

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return;
    }

    try {
      await addProductMutation.mutateAsync([
        {
          productId: selectedProductOption.productId,
          clientProductId: selectedProductOption.clientProductId,
          quantityPrevious,
          quantityGoodRemaining: quantityPrevious,
          quantityDefectiveReturn: 0,
          quantityLoss: 0,
          unitPrice,
          suggestedRestockQuantity: 0,
          restockedQuantity: 0
        }
      ]);
    } catch {
      return;
    }
  };

  const onConclude = async () => {
    const saved = await saveDraft();

    if (!saved) {
      return;
    }

    if (normalizeMoneyValue(receivedAmountValue) > 0) {
      setIsPaymentDrawerOpen(true);
      return;
    }

    if (!window.confirm("Concluir esta visita agora?")) {
      return;
    }

    try {
      await completeMutation.mutateAsync(undefined);
    } catch {
      return;
    }
  };

  const onConfirmPaymentAndConclude = async () => {
    if (!paymentMethod) {
      return;
    }

    if (!window.confirm("Confirmar conclusao da visita?")) {
      return;
    }

    try {
      await completeMutation.mutateAsync({
        paymentMethod: paymentMethod as (typeof paymentMethods)[number],
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined
      });
    } catch {
      return;
    }
  };

  const addProductQuantityError =
    addProductPreviousInput.trim() !== "" && (Number.isNaN(parseCountInput(addProductPreviousInput)) || parseCountInput(addProductPreviousInput) < 0)
      ? "Informe uma base anterior valida."
      : undefined;
  const addProductPriceError =
    addProductUnitPriceInput.trim() !== "" && (Number.isNaN(parseMoneyInput(addProductUnitPriceInput)) || parseMoneyInput(addProductUnitPriceInput) < 0)
      ? "Informe um preco valido."
      : undefined;
  const autoPopulateError =
    clientCatalogQuery.isError || completedHistoryQuery.isError || autoPopulateMutation.error
      ? "Nao foi possivel carregar automaticamente os produtos ja presentes na loja. Voce pode seguir pela adicao manual."
      : null;
  const activeDraftError = formatUnknownError(draftMutationError);
  const activeCompletionError =
    completeMutation.error instanceof ApiError ? formatCompletionError(completeMutation.error, visit) : formatUnknownError(completeMutation.error);
  const activeAddProductError = formatUnknownError(addProductMutation.error) ?? formatUnknownError(productsQuery.error);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Visita de consignacao"
        title={clientName}
        subtitle={`${visit.visitCode} · ${formatDate(visit.visitedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ToneBadge label="Consignacao" tone="neutral" />
            <ToneBadge label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} />
          </div>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCell label="Data da visita" value={formatDate(visit.visitedAt)} />
          <MetricCell label="Produtos" value={String(visit.items.length)} />
          <MetricCell label="Recebido" value={formatCurrency(visitNumber(visit.receivedAmountOnVisit))} />
        </div>

        {isDraft ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--jam-subtle)]">A visita segue a ordem real do papel: vender, receber e depois repor.</p>
            <Link to={`/visits/${visit.id}/edit`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Editar dados da visita
              </Button>
            </Link>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <StepHeader
          step="Etapa 1"
          title="Conferir venda do periodo"
          subtitle="Vendida e o campo principal. Trocas e perdas ficam em ajustes."
          action={
            isDraft ? (
              <Button className="w-full sm:w-auto" onClick={() => setIsAddProductOpen(true)}>
                Adicionar produto
              </Button>
            ) : undefined
          }
        />

        {autoPopulateCount > 0 ? (
          <div className="rounded-xl border border-[rgba(29,78,216,0.16)] bg-[rgba(29,78,216,0.05)] px-3.5 py-3 text-sm text-[var(--jam-ink)]">
            A base anterior do cliente foi carregada automaticamente a partir do historico recente.
          </div>
        ) : null}

        {shouldAutopopulate && (clientCatalogQuery.isPending || completedHistoryQuery.isPending || autoPopulateMutation.isPending) ? (
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-subtle)]">
            Preparando os produtos que ja estavam no cliente para a conferencia de hoje.
          </div>
        ) : null}

        {autoPopulateError ? <WarningBanner message={autoPopulateError} /> : null}

        {visit.items.length === 0 ? (
          <EmptyState
            title="Nenhum produto na conferencia"
            message="Adicione os produtos da consignacao para preencher a folha do periodo."
            action={
              isDraft ? (
                <Button onClick={() => setIsAddProductOpen(true)} disabled={isBusy}>
                  Adicionar primeiro produto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[88px_96px_minmax(0,1.4fr)_120px_120px_92px] gap-3 border-b border-[var(--jam-border)] px-1 pb-2 sm:grid">
              <ColumnLabel>Anterior</ColumnLabel>
              <ColumnLabel>Vendida</ColumnLabel>
              <ColumnLabel>Produto</ColumnLabel>
              <ColumnLabel>Preco</ColumnLabel>
              <ColumnLabel>Total</ColumnLabel>
              <ColumnLabel className="text-right">Ajustes</ColumnLabel>
            </div>

            {rowViewModels.map((row) => {
              const isExpanded = expandedRows[row.item.id] ?? false;

              return (
                <div key={row.item.id} className="rounded-2xl border border-[var(--jam-border)] bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-[88px_96px_minmax(0,1.4fr)_120px_120px_92px] sm:items-center">
                    <DataCell label="Anterior">
                      <ReadonlyValue value={String(row.item.quantityPrevious)} />
                    </DataCell>

                    <DataCell label="Vendida">
                      <Input
                        value={row.draft.quantitySold}
                        inputMode="decimal"
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const value = event.target.value;
                          setItemDrafts((current) => ({
                            ...current,
                            [row.item.id]: {
                              ...current[row.item.id],
                              quantitySold: value
                            }
                          }));
                        }}
                        className="text-right font-semibold text-[var(--jam-ink)]"
                      />
                    </DataCell>

                    <DataCell label="Produto">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{row.item.productSnapshotName}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--jam-subtle)]">{row.item.productSnapshotSku}</p>
                      </div>
                    </DataCell>

                    <DataCell label="Preco">
                      <Input
                        value={row.draft.unitPrice}
                        inputMode="decimal"
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const value = event.target.value;
                          setItemDrafts((current) => ({
                            ...current,
                            [row.item.id]: {
                              ...current[row.item.id],
                              unitPrice: value
                            }
                          }));
                        }}
                        className="text-right"
                      />
                    </DataCell>

                    <DataCell label="Total">
                      <ReadonlyValue value={formatCurrency(row.subtotalAmount)} emphasize />
                    </DataCell>

                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)] sm:hidden">Ajustes</span>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-center border border-[var(--jam-border)] bg-white sm:w-auto"
                        onClick={() =>
                          setExpandedRows((current) => ({
                            ...current,
                            [row.item.id]: !isExpanded
                          }))
                        }
                      >
                        {isExpanded ? "Fechar" : "Ajustes"}
                      </Button>
                    </div>
                  </div>

                  {row.errors.length > 0 ? (
                    <p className="mt-3 text-sm font-medium text-[var(--jam-danger)]">{row.errors.join(" ")}</p>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-3 space-y-3 rounded-xl bg-[var(--jam-panel-strong)] p-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Trocas">
                          <Input
                            value={row.draft.quantityDefectiveReturn}
                            inputMode="decimal"
                            disabled={isReadOnly}
                            onChange={(event) => {
                              const value = event.target.value;
                              setItemDrafts((current) => ({
                                ...current,
                                [row.item.id]: {
                                  ...current[row.item.id],
                                  quantityDefectiveReturn: value
                                }
                              }));
                            }}
                            className="text-right"
                          />
                        </Field>

                        <Field label="Perdas">
                          <Input
                            value={row.draft.quantityLoss}
                            inputMode="decimal"
                            disabled={isReadOnly}
                            onChange={(event) => {
                              const value = event.target.value;
                              setItemDrafts((current) => ({
                                ...current,
                                [row.item.id]: {
                                  ...current[row.item.id],
                                  quantityLoss: value
                                }
                              }));
                            }}
                            className="text-right"
                          />
                        </Field>

                        <Field label="Restante">
                          <Input value={String(row.remainingQuantity)} disabled className="text-right font-medium" />
                        </Field>
                      </div>

                      <Field label="Observacao do item">
                        <Textarea
                          rows={3}
                          disabled={isReadOnly}
                          value={row.draft.notes}
                          onChange={(event) => {
                            const value = event.target.value;
                            setItemDrafts((current) => ({
                              ...current,
                              [row.item.id]: {
                                ...current[row.item.id],
                                notes: value
                              }
                            }));
                          }}
                          placeholder="Observacoes opcionais sobre a conferencia deste produto"
                        />
                      </Field>

                      {isDraft ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="danger"
                            disabled={deleteItemMutation.isPending}
                            onClick={() => {
                        if (!window.confirm("Remover este produto da visita nao finalizada?")) {
                          return;
                        }

                              void deleteItemMutation.mutateAsync({ itemId: row.item.id }).catch(() => undefined);
                            }}
                          >
                            Remover produto
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <StepHeader
          step="Etapa 2"
          title="Receber"
          subtitle="Aqui entram apenas total do acerto, valor recebido e saldo."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCell label="Total do acerto" value={formatCurrency(totals.totalAmount)} emphasize />
          <MetricCell label="Valor recebido" value={formatCurrency(safeReceivedAmount)} />
          <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
        </div>

        {isDraft ? (
          <div className="max-w-md">
            <Field label="Valor recebido" error={receivedAmountError ?? undefined}>
              <Input
                value={receivedAmountInput}
                inputMode="decimal"
                onChange={(event) => setReceivedAmountInput(event.target.value)}
                placeholder="0,00"
              />
            </Field>
          </div>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">O valor recebido ficou registrado junto com esta visita.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <StepHeader
          step="Etapa 3"
          title="Repor e gerar nova base"
          subtitle="Informe apenas o que vai hoje. A nova base sai automaticamente."
        />

        {visit.items.length === 0 ? (
          <p className="text-sm text-[var(--jam-subtle)]">A reposicao aparece depois que voce montar a conferencia do periodo.</p>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_96px_110px_110px] gap-3 border-b border-[var(--jam-border)] px-1 pb-2 sm:grid">
              <ColumnLabel>Produto</ColumnLabel>
              <ColumnLabel>Restante</ColumnLabel>
              <ColumnLabel>Repor hoje</ColumnLabel>
              <ColumnLabel>Nova base</ColumnLabel>
            </div>

            {rowViewModels.map((row) => (
              <div key={`${row.item.id}-restock`} className="rounded-2xl border border-[var(--jam-border)] bg-white p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_96px_110px_110px] sm:items-center">
                  <DataCell label="Produto">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--jam-ink)]">{row.item.productSnapshotName}</p>
                      <p className="mt-0.5 text-xs text-[var(--jam-subtle)]">Central disponivel: {row.availableCentralQuantity}</p>
                    </div>
                  </DataCell>

                  <DataCell label="Restante">
                    <ReadonlyValue value={String(row.remainingQuantity)} />
                  </DataCell>

                  <DataCell label="Repor hoje">
                    <Input
                      value={row.draft.restockedQuantity}
                      inputMode="decimal"
                      disabled={isReadOnly}
                      onChange={(event) => {
                        const value = event.target.value;
                        setItemDrafts((current) => ({
                          ...current,
                          [row.item.id]: {
                            ...current[row.item.id],
                            restockedQuantity: value
                          }
                        }));
                      }}
                      className="text-right"
                    />
                  </DataCell>

                  <DataCell label="Nova base">
                    <ReadonlyValue value={String(row.nextBaseQuantity)} emphasize />
                  </DataCell>
                </div>

                {row.exceedsCentralStock ? (
                  <p className="mt-2 text-sm font-medium text-[var(--jam-danger)]">
                    Reposicao acima do estoque central. Disponivel: {row.availableCentralQuantity}. Informado: {row.restockedQuantity}.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <MetricCell label="Produtos" value={String(totals.itemCount)} />
          <MetricCell label="Vendida" value={String(totals.quantitySold)} />
          <MetricCell label="Reposto hoje" value={String(totals.restockedQuantity)} />
          <MetricCell label="Nova base" value={String(totals.nextBaseQuantity)} emphasize />
        </div>

        {stockWarnings.length > 0 ? (
          <WarningBanner
            message={`Revise a reposicao antes de concluir. ${stockWarnings
              .map((row) => `${row.item.productSnapshotName}: repor ${row.restockedQuantity}, central ${row.availableCentralQuantity}`)
              .join(" | ")}`}
          />
        ) : null}

        {draftValidationError ? <ErrorBanner message={draftValidationError} /> : null}
        {activeDraftError ? <ErrorBanner message={activeDraftError} /> : null}
        {activeCompletionError ? <ErrorBanner message={activeCompletionError} /> : null}

        {isDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" disabled={isBusy} onClick={() => void saveDraft()}>
              {saveBusy ? "Salvando..." : "Salvar visita"}
            </Button>
            <Button disabled={isBusy || !canConclude} onClick={() => void onConclude()}>
              {completeMutation.isPending ? "Concluindo..." : "Concluir visita"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">
            {visit.status === "COMPLETED"
              ? "A nova base desta visita ficou registrada e a tela agora esta somente para leitura."
              : "A visita foi cancelada e a conferencia ficou apenas para consulta."}
          </p>
        )}
      </Card>

      {visit.status === "COMPLETED" ? <VisitReceiptCard visit={visit} /> : null}

      <Card className="space-y-4">
        <StepHeader step="Observacoes" title="Observacoes da visita" />
        {isDraft ? (
          <Field label="Anotacoes gerais">
            <Textarea
              value={visitNotesInput}
              rows={4}
              onChange={(event) => setVisitNotesInput(event.target.value)}
              placeholder="Anotacoes gerais desta visita"
            />
          </Field>
        ) : (
          <p className="text-sm text-[var(--jam-subtle)]">{visit.notes || "Sem observacoes registradas."}</p>
        )}
      </Card>

      {isDraft ? (
        <Card className="space-y-3">
          <StepHeader step="Nao finalizada" title="Acoes da visita" />
          <Button
            variant="danger"
            className="w-full"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (!window.confirm("Cancelar esta visita nao finalizada?")) {
                return;
              }

              void cancelMutation
                .mutateAsync()
                .then(() => navigate("/visits", { replace: true }))
                .catch(() => undefined);
            }}
          >
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar visita"}
          </Button>
        </Card>
      ) : null}

      <DrawerPanel
        open={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Adicionar produto"
        description="Selecione o produto da consignacao e informe a base anterior para colocar na folha."
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => setIsAddProductOpen(false)} disabled={addProductMutation.isPending}>
              Fechar
            </Button>
            <Button
              onClick={() => void onAddProduct()}
              disabled={
                addProductMutation.isPending ||
                !selectedProductOption ||
                Boolean(addProductQuantityError) ||
                Boolean(addProductPriceError)
              }
            >
              {addProductMutation.isPending ? "Adicionando..." : "Adicionar produto"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {activeAddProductError ? <ErrorBanner message={activeAddProductError} /> : null}

          {productsQuery.isPending ? (
            <p className="text-sm text-[var(--jam-subtle)]">Carregando produtos disponiveis...</p>
          ) : availableProducts.length === 0 ? (
            <EmptyState
              title="Sem produtos disponiveis"
              message="Todos os produtos ativos ja estao na visita ou nao ha produtos liberados para este cliente."
            />
          ) : (
            <>
              <Field label="Produto">
                <Select value={addProductId} onChange={(event) => setAddProductId(event.target.value)}>
                  <option value="">Selecione</option>
                  {availableProducts.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName} · {product.productSku}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Base anterior"
                hint={
                  selectedProductOption?.suggestedPrevious !== null && selectedProductOption?.suggestedPrevious !== undefined
                    ? `Sugestao pelo ultimo historico concluido: ${selectedProductOption.suggestedPrevious}`
                    : "Informe quanto ja estava no cliente antes desta visita."
                }
                error={addProductQuantityError}
              >
                <Input
                  value={addProductPreviousInput}
                  inputMode="decimal"
                  onChange={(event) => setAddProductPreviousInput(event.target.value)}
                  placeholder="0"
                />
              </Field>

              <Field label="Preco" error={addProductPriceError}>
                <Input
                  value={addProductUnitPriceInput}
                  inputMode="decimal"
                  onChange={(event) => setAddProductUnitPriceInput(event.target.value)}
                  placeholder="0,00"
                />
              </Field>

              {selectedProductOption ? (
                <div className="rounded-xl bg-[var(--jam-panel-strong)] p-3 text-sm text-[var(--jam-subtle)]">
                  <p className="font-medium text-[var(--jam-ink)]">{selectedProductOption.productName}</p>
                  <p className="mt-1">SKU: {selectedProductOption.productSku}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </DrawerPanel>

      <DrawerPanel
        open={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        title="Forma de pagamento"
        description="Como houve valor recebido na visita, confirme o pagamento inicial antes de concluir."
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => setIsPaymentDrawerOpen(false)} disabled={completeMutation.isPending}>
              Voltar
            </Button>
            <Button onClick={() => void onConfirmPaymentAndConclude()} disabled={completeMutation.isPending || !paymentMethod}>
              {completeMutation.isPending ? "Concluindo..." : "Confirmar conclusao"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCell label="Total do acerto" value={formatCurrency(totals.totalAmount)} />
            <MetricCell label="Valor recebido" value={formatCurrency(safeReceivedAmount)} />
            <MetricCell label="Saldo" value={formatCurrency(pendingAmount)} />
          </div>

          <Field label="Forma de pagamento">
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="">Selecione</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {formatPaymentMethod(method)}
                </option>
              ))}
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

function buildItemDraftMap(items: VisitItem[]): Record<string, ItemDraftState> {
  return Object.fromEntries(items.map((item) => [item.id, createItemDraft(item)]));
}

function createItemDraft(item: VisitItem): ItemDraftState {
  return {
    quantitySold: String(item.quantitySold),
    quantityDefectiveReturn: String(item.quantityDefectiveReturn),
    quantityLoss: String(item.quantityLoss),
    unitPrice: String(visitNumber(item.unitPrice)),
    restockedQuantity: String(item.restockedQuantity),
    notes: item.notes ?? ""
  };
}

function buildRowViewModel({
  item,
  draft,
  availableCentralQuantity
}: {
  item: VisitItem;
  draft: ItemDraftState;
  availableCentralQuantity: number;
}): RowViewModel {
  const quantitySoldInput = parseCountInput(draft.quantitySold);
  const quantityDefectiveReturnInput = parseCountInput(draft.quantityDefectiveReturn);
  const quantityLossInput = parseCountInput(draft.quantityLoss);
  const unitPriceInput = parseMoneyInput(draft.unitPrice);
  const restockedQuantityInput = parseCountInput(draft.restockedQuantity);

  const quantitySold = Number.isNaN(quantitySoldInput) ? 0 : quantitySoldInput;
  const quantityDefectiveReturn = Number.isNaN(quantityDefectiveReturnInput) ? 0 : quantityDefectiveReturnInput;
  const quantityLoss = Number.isNaN(quantityLossInput) ? 0 : quantityLossInput;
  const unitPrice = Number.isNaN(unitPriceInput) ? 0 : unitPriceInput;
  const restockedQuantity = Number.isNaN(restockedQuantityInput) ? 0 : restockedQuantityInput;
  const remainingQuantity = Number((item.quantityPrevious - quantitySold - quantityDefectiveReturn - quantityLoss).toFixed(2));
  const subtotalAmount = Number((Math.max(quantitySold, 0) * Math.max(unitPrice, 0)).toFixed(2));
  const nextBaseQuantity = Number((remainingQuantity + restockedQuantity).toFixed(2));
  const errors: string[] = [];

  if (Number.isNaN(quantitySoldInput) || quantitySoldInput < 0) {
    errors.push("Vendida precisa ser um numero valido.");
  }

  if (Number.isNaN(quantityDefectiveReturnInput) || quantityDefectiveReturnInput < 0) {
    errors.push("Trocas precisam ser validas.");
  }

  if (Number.isNaN(quantityLossInput) || quantityLossInput < 0) {
    errors.push("Perdas precisam ser validas.");
  }

  if (Number.isNaN(unitPriceInput) || unitPriceInput < 0) {
    errors.push("Preco precisa ser valido.");
  }

  if (Number.isNaN(restockedQuantityInput) || restockedQuantityInput < 0) {
    errors.push("Reposicao precisa ser valida.");
  }

  if (remainingQuantity < 0) {
    errors.push("O restante nao pode ficar negativo.");
  }

  return {
    item,
    draft,
    quantitySold,
    quantityDefectiveReturn,
    quantityLoss,
    unitPrice,
    restockedQuantity,
    remainingQuantity,
    subtotalAmount,
    nextBaseQuantity,
    hasChanges:
      quantitySold !== item.quantitySold ||
      quantityDefectiveReturn !== item.quantityDefectiveReturn ||
      quantityLoss !== item.quantityLoss ||
      normalizeMoneyValue(unitPrice) !== normalizeMoneyValue(item.unitPrice) ||
      restockedQuantity !== item.restockedQuantity ||
      draft.notes !== (item.notes ?? ""),
    errors,
    availableCentralQuantity,
    exceedsCentralStock: restockedQuantity > availableCentralQuantity
  };
}

function parseCountInput(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return parseDecimalInput(value);
}

function parseMoneyInput(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return parseDecimalInput(value);
}

function normalizeMoneyValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function buildReceivedAmountError(receivedAmountValue: number, totalAmount: number): string | null {
  if (Number.isNaN(receivedAmountValue) || receivedAmountValue < 0) {
    return "Informe um valor recebido valido.";
  }

  if (normalizeMoneyValue(receivedAmountValue) > normalizeMoneyValue(totalAmount)) {
    return "O valor recebido nao pode ser maior que o total do acerto.";
  }

  return null;
}

function resolveActiveError(...errors: Array<unknown>): unknown {
  return errors.find(Boolean) ?? null;
}

function formatUnknownError(error: unknown): string | null {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return null;
}

function handleVisitMutationSuccess(queryClient: QueryClient) {
  return async (nextVisit: VisitDetail) => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
    queryClient.setQueryData(["visit", nextVisit.id], nextVisit);
  };
}

function formatCompletionError(error: ApiError, visit: VisitDetail): string {
  if (error.code !== "INSUFFICIENT_CENTRAL_STOCK") {
    return error.message;
  }

  const rawItems = (
    error.details as { visitProducts?: Array<{ productId: string; requiredQuantity: number; availableQuantity: number }> } | null
  )?.visitProducts;

  if (!rawItems || rawItems.length === 0) {
    return "Estoque central insuficiente para concluir a visita.";
  }

  const formattedItems = rawItems
    .map((entry) => {
      const label = visit.items.find((item) => item.productId === entry.productId)?.productSnapshotName ?? "Produto";
      return `${label}: precisa ${entry.requiredQuantity}, disponivel ${entry.availableQuantity}`;
    })
    .join(" | ");

  return `Estoque central insuficiente. ${formattedItems}`;
}

function formatPaymentMethod(method: (typeof paymentMethods)[number]) {
  if (method === "BANK_TRANSFER") {
    return "Transferencia";
  }

  if (method === "CASH") {
    return "Dinheiro";
  }

  if (method === "CARD") {
    return "Cartao";
  }

  if (method === "PIX") {
    return "PIX";
  }

  return "Outro";
}

function StepHeader({
  step,
  title,
  subtitle,
  action
}: {
  step: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">{step}</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="w-full sm:w-auto sm:shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCell({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className={cx("rounded-xl p-3", emphasize ? "bg-[rgba(29,78,216,0.08)]" : "bg-white")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function ColumnLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]", className)}>{children}</p>;
}

function DataCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)] sm:hidden">{label}</p>
      {children}
    </div>
  );
}

function ReadonlyValue({
  value,
  emphasize = false
}: {
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex min-h-10 items-center rounded-xl border border-[var(--jam-border)] px-3 text-right text-sm font-medium text-[var(--jam-ink)]",
        emphasize ? "bg-[var(--jam-panel-strong)]" : "bg-white"
      )}
    >
      <span className="w-full truncate">{value}</span>
    </div>
  );
}
