import { Prisma, type ClientProduct, type VisitItem } from "@prisma/client";
import path from "node:path";

import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import { removeStorageFile, writeStorageFile } from "../../shared/utils/local-storage";
import { normalizeSignatureImage } from "../../shared/utils/signature-image";
import type {
  BulkUpsertVisitItemsInput,
  CreateVisitInput,
  OperationalCompletedConsignmentRecord,
  OperationalDraftVisitRecord,
  OperationalInProgressVisit,
  OperationalQueueMainAction,
  OperationalVisitQueue,
  PatchVisitItemInput,
  PutVisitSignatureInput,
  UpdateVisitInput,
  VisitDraftItemInput,
  VisitListQuery,
  VisitWithItems
} from "./visit.types";
import {
  computeDraftVisitItem,
  ensureClientProductMatchesVisit,
  ensureReceivedAmountWithinTotal,
  ensureVisitCanBeSigned,
  ensureVisitSignatureCanBeRemoved,
  ensureVisitIsDraft,
  generateVisitCode,
  mergeEditableVisitItemFields
} from "./visit.validators";
import { VisitRepository } from "./visit.repository";

export class VisitService {
  constructor(private readonly repository = new VisitRepository()) {}

  list(filters: VisitListQuery) {
    return this.repository.list(filters);
  }

  async getOperationalQueue(): Promise<OperationalVisitQueue> {
    const [drafts, completedConsignments, recentHistory] = await Promise.all([
      this.repository.listDraftsForOperationalQueue(),
      this.repository.listCompletedConsignmentsForOperationalQueue(),
      this.repository.listRecentCompletedForOperationalQueue(20)
    ]);

    const inProgress = drafts.map(mapDraftToOperationalInProgress);
    const draftClientIds = new Set(drafts.map((visit) => visit.clientId));
    const latestCompletedConsignmentByClientId = new Map<string, OperationalCompletedConsignmentRecord>();

    for (const visit of completedConsignments) {
      if (draftClientIds.has(visit.clientId) || latestCompletedConsignmentByClientId.has(visit.clientId)) {
        continue;
      }

      latestCompletedConsignmentByClientId.set(visit.clientId, visit);
    }

    const consignedBalances = await this.repository.listConsignedBalancesByClientIds([
      ...latestCompletedConsignmentByClientId.keys()
    ]);
    const consignedBalanceSummaryByClientId = buildConsignedBalanceSummaryByClientId(consignedBalances);

    const returnQueue = [...latestCompletedConsignmentByClientId.values()]
      .sort(
        (left, right) =>
          left.visitedAt.getTime() - right.visitedAt.getTime() ||
          left.createdAt.getTime() - right.createdAt.getTime()
      )
      .map((visit) => {
        const summary = consignedBalanceSummaryByClientId.get(visit.clientId) ?? {
          itemCount: 0,
          baseQuantity: 0
        };

        return {
          clientId: visit.clientId,
          clientName: visit.client.tradeName,
          sourceVisitId: visit.id,
          sourceVisitCode: visit.visitCode,
          lastVisitAt: visit.visitedAt,
          itemCount: summary.itemCount,
          baseQuantity: summary.baseQuantity
        };
      });

    return {
      mainAction: buildOperationalMainAction(inProgress[0]),
      returnQueue,
      inProgress,
      recentHistory: recentHistory.map((visit) => ({
        visitId: visit.id,
        visitCode: visit.visitCode,
        clientId: visit.clientId,
        clientName: visit.client.tradeName,
        visitType: visit.visitType,
        visitedAt: visit.visitedAt,
        completedAt: visit.completedAt,
        totalAmount: moneyToNumber(visit.totalAmount) ?? 0,
        receivedAmount:
          moneyToNumber(visit.receivable?.amountReceived) ??
          moneyToNumber(visit.receivedAmountOnVisit) ??
          0,
        receivableStatus: visit.receivable?.status ?? null,
        hasReceipt: Boolean(visit.receiptDocument)
      }))
    };
  }

  async getById(id: string): Promise<VisitWithItems> {
    const visit = await this.repository.findByIdWithItems(id);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id });
    }

    return visit;
  }

  async create(input: CreateVisitInput): Promise<VisitWithItems> {
    ensureReceivedAmountWithinTotal(input.receivedAmountOnVisit ?? 0, 0);

    const visit = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: input.clientId },
        select: { id: true }
      });

      if (!client) {
        throw new NotFoundError("Client not found", { clientId: input.clientId });
      }

      const existingDraft = await this.repository.findDraftByClientId(input.clientId, tx);

      if (existingDraft) {
        throw new AppError(
          409,
          "VISIT_ALREADY_OPEN",
          "Este cliente ja tem uma visita nao finalizada em aberto.",
          {
            clientId: input.clientId,
            visitId: existingDraft.id
          }
        );
      }

      const created = await this.repository.create(
        {
          visitCode: generateVisitCode(),
          clientId: input.clientId,
          visitType: input.visitType,
          status: "DRAFT",
          visitedAt: input.visitedAt,
          notes: input.notes,
          receivedAmountOnVisit: input.receivedAmountOnVisit ?? 0,
          dueDate: input.dueDate
        },
        tx
      );

      return created;
    });

    return this.getById(visit.id);
  }

  async update(id: string, input: UpdateVisitInput): Promise<VisitWithItems> {
    const visit = await this.ensureDraftVisit(id);
    const nextReceivedAmount = input.receivedAmountOnVisit ?? visit.receivedAmountOnVisit;

    ensureReceivedAmountWithinTotal(nextReceivedAmount, visit.totalAmount);

    await this.repository.updateMetadata(id, {
      ...input,
      dueDate: input.dueDate === null ? null : input.dueDate
    });

    return this.getById(id);
  }

  async bulkUpsertItems(visitId: string, input: BulkUpsertVisitItemsInput): Promise<VisitWithItems> {
    const visit = await this.ensureDraftVisit(visitId);

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const writeData = await this.buildDraftItemWriteData(visit.clientId, visit.visitType, item, tx);
        await this.repository.upsertItemByProduct(visit.id, item.productId, writeData, tx);
      }

      await this.refreshVisitTotal(visit.id, visit.receivedAmountOnVisit, tx);
    });

    return this.getById(visitId);
  }

  async patchItem(visitId: string, itemId: string, input: PatchVisitItemInput): Promise<VisitWithItems> {
    const visit = await this.ensureDraftVisit(visitId);

    await prisma.$transaction(async (tx) => {
      const existingItem = await this.repository.findItemById(itemId, tx);

      if (!existingItem || existingItem.visitId !== visitId) {
        throw new NotFoundError("Visit item not found", { visitId, itemId });
      }

      const editableItem = {
        clientProductId: existingItem.clientProductId,
        quantityPrevious: existingItem.quantityPrevious,
        quantityGoodRemaining: existingItem.quantityGoodRemaining,
        quantityDefectiveReturn: existingItem.quantityDefectiveReturn,
        quantityLoss: existingItem.quantityLoss,
        unitPrice: Number(existingItem.unitPrice),
        suggestedRestockQuantity: existingItem.suggestedRestockQuantity,
        restockedQuantity: existingItem.restockedQuantity,
        notes: existingItem.notes
      };

      const nextItem = mergeEditableVisitItemFields(editableItem, {
        clientProductId: input.clientProductId,
        quantityPrevious: input.quantityPrevious,
        quantityGoodRemaining: input.quantityGoodRemaining,
        quantityDefectiveReturn: input.quantityDefectiveReturn,
        quantityLoss: input.quantityLoss,
        unitPrice: input.unitPrice,
        suggestedRestockQuantity: input.suggestedRestockQuantity,
        restockedQuantity: input.restockedQuantity,
        notes: input.notes
      });

      const writeData = await this.buildDraftItemWriteData(
        visit.clientId,
        visit.visitType,
        {
          productId: existingItem.productId,
          clientProductId: nextItem.clientProductId,
          quantityPrevious: nextItem.quantityPrevious,
          quantityGoodRemaining: nextItem.quantityGoodRemaining,
          quantityDefectiveReturn: nextItem.quantityDefectiveReturn,
          quantityLoss: nextItem.quantityLoss,
          unitPrice: nextItem.unitPrice,
          suggestedRestockQuantity: nextItem.suggestedRestockQuantity,
          restockedQuantity: nextItem.restockedQuantity,
          notes: nextItem.notes ?? undefined
        },
        tx
      );

      await this.repository.updateItem(itemId, writeData, tx);
      await this.refreshVisitTotal(visit.id, visit.receivedAmountOnVisit, tx);
    });

    return this.getById(visitId);
  }

  async deleteItem(visitId: string, itemId: string): Promise<VisitWithItems> {
    const visit = await this.ensureDraftVisit(visitId);

    await prisma.$transaction(async (tx) => {
      const existingItem = await this.repository.findItemById(itemId, tx);

      if (!existingItem || existingItem.visitId !== visitId) {
        throw new NotFoundError("Visit item not found", { visitId, itemId });
      }

      await this.repository.deleteItem(itemId, tx);
      await this.refreshVisitTotal(visit.id, visit.receivedAmountOnVisit, tx);
    });

    return this.getById(visitId);
  }

  async cancel(id: string): Promise<VisitWithItems> {
    await this.ensureDraftVisit(id);
    await this.repository.cancel(id);
    return this.getById(id);
  }

  async putSignature(id: string, input: PutVisitSignatureInput): Promise<VisitWithItems> {
    const visit = await this.repository.findById(id);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id });
    }

    ensureVisitCanBeSigned(visit);

    const normalizedImage = normalizeSignatureImage({
      mimeType: input.mimeType,
      signatureImageBase64: input.signatureImageBase64
    });

    const nextStorageKey = path.posix.join("signatures", "visits", visit.id, `signature.${normalizedImage.extension}`);
    const previousStorageKey = visit.signatureImageKey;

    await writeStorageFile(nextStorageKey, normalizedImage.buffer);

    try {
      await this.repository.updateSignature(visit.id, {
        signatureStatus: "SIGNED",
        signatureName: input.signatureName,
        signatureImageKey: nextStorageKey,
        signedAt: new Date()
      });
    } catch (error) {
      await removeStorageFile(nextStorageKey);
      throw error;
    }

    if (previousStorageKey && previousStorageKey !== nextStorageKey) {
      await removeStorageFile(previousStorageKey);
    }

    return this.getById(id);
  }

  async removeSignature(id: string): Promise<VisitWithItems> {
    const visit = await this.repository.findById(id);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id });
    }

    ensureVisitSignatureCanBeRemoved(visit);

    const previousStorageKey = visit.signatureImageKey;

    await this.repository.updateSignature(visit.id, {
      signatureStatus: "PENDING",
      signatureName: null,
      signatureImageKey: null,
      signedAt: null
    });

    await removeStorageFile(previousStorageKey);

    return this.getById(id);
  }

  private async ensureDraftVisit(id: string) {
    const visit = await this.repository.findById(id);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id });
    }

    ensureVisitIsDraft(visit);
    return visit;
  }

  private async buildDraftItemWriteData(
    visitClientId: string,
    visitType: VisitWithItems["visitType"],
    item: VisitDraftItemInput,
    db: Prisma.TransactionClient
  ) {
    const product = await this.repository.findProductById(item.productId, db);

    if (!product) {
      throw new AppError(400, "INVALID_PRODUCT", "Product does not exist", { productId: item.productId });
    }

    if (visitType === "SALE") {
      if (item.quantityPrevious <= 0) {
        throw new AppError(400, "INVALID_VISIT_ITEM", "Sale item quantity must be greater than zero", {
          productId: item.productId
        });
      }

      return computeDraftVisitItem({
        product,
        clientProduct: null,
        clientProductId: null,
        quantityPrevious: item.quantityPrevious,
        quantityGoodRemaining: 0,
        quantityDefectiveReturn: 0,
        quantityLoss: 0,
        unitPrice: item.unitPrice ?? Number(product.basePrice),
        suggestedRestockQuantity: 0,
        restockedQuantity: 0,
        notes: item.notes
      });
    }

    const clientProduct = item.clientProductId
      ? await this.repository.findClientProductById(item.clientProductId, db)
      : await this.repository.findClientProductByClientAndProduct(visitClientId, item.productId, db);

    if (item.clientProductId && !clientProduct) {
      throw new AppError(
        400,
        "INVALID_CLIENT_PRODUCT",
        "Client product configuration was not found for this visit item",
        { clientId: visitClientId, productId: item.productId, clientProductId: item.clientProductId }
      );
    }

    ensureClientProductMatchesVisit(visitClientId, item.productId, clientProduct);

    const unitPrice = item.unitPrice ?? Number(clientProduct?.currentUnitPrice ?? product.basePrice);
    const resolvedClientProduct = await this.resolveClientProductForDraftItem(
      visitClientId,
      product.id,
      unitPrice,
      clientProduct,
      db
    );

    return computeDraftVisitItem({
      product,
      clientProduct: resolvedClientProduct,
      clientProductId: resolvedClientProduct?.id ?? item.clientProductId ?? null,
      quantityPrevious: item.quantityPrevious,
      quantityGoodRemaining: item.quantityGoodRemaining,
      quantityDefectiveReturn: item.quantityDefectiveReturn,
      quantityLoss: item.quantityLoss,
      unitPrice,
      suggestedRestockQuantity: item.suggestedRestockQuantity ?? 0,
      restockedQuantity: item.restockedQuantity ?? 0,
      notes: item.notes
    });
  }

  private async resolveClientProductForDraftItem(
    clientId: string,
    productId: string,
    unitPrice: number,
    clientProduct: ClientProduct | null,
    db: Prisma.TransactionClient
  ) {
    if (clientProduct && clientProduct.isActive) {
      return clientProduct;
    }

    if (clientProduct && !clientProduct.isActive) {
      return this.repository.updateClientProduct(
        clientProduct.id,
        {
          currentUnitPrice: unitPrice,
          isActive: true
        },
        db
      );
    }

    return this.repository.createClientProduct(
      {
        clientId,
        productId,
        currentUnitPrice: unitPrice,
        isActive: true
      },
      db
    );
  }

  private async refreshVisitTotal(
    visitId: string,
    receivedAmountOnVisit: Prisma.Decimal | number,
    db: Prisma.TransactionClient
  ): Promise<void> {
    const totalAmount = await this.repository.aggregateVisitTotal(visitId, db);
    ensureReceivedAmountWithinTotal(receivedAmountOnVisit, totalAmount);
    await this.repository.updateTotalAmount(visitId, totalAmount, db);
  }
}

function mapDraftToOperationalInProgress(visit: OperationalDraftVisitRecord): OperationalInProgressVisit {
  return {
    visitId: visit.id,
    visitCode: visit.visitCode,
    clientId: visit.clientId,
    clientName: visit.client.tradeName,
    visitType: visit.visitType,
    visitedAt: visit.visitedAt,
    itemCount: visit._count.items,
    nextStepLabel: resolveOperationalNextStepLabel(visit.visitType, visit._count.items)
  };
}

function resolveOperationalNextStepLabel(visitType: "CONSIGNMENT" | "SALE", itemCount: number): string {
  if (itemCount === 0) {
    return "Adicionar itens";
  }

  return visitType === "SALE" ? "Continuar venda" : "Continuar acerto";
}

function buildOperationalMainAction(
  visit: OperationalInProgressVisit | undefined
): OperationalQueueMainAction {
  if (!visit) {
    return {
      mode: "new",
      visitId: null,
      clientId: null,
      clientName: null,
      visitCode: null,
      visitType: null,
      visitedAt: null,
      nextStepLabel: null
    };
  }

  return {
    mode: "continue",
    visitId: visit.visitId,
    clientId: visit.clientId,
    clientName: visit.clientName,
    visitCode: visit.visitCode,
    visitType: visit.visitType,
    visitedAt: visit.visitedAt,
    nextStepLabel: visit.nextStepLabel
  };
}

function buildConsignedBalanceSummaryByClientId(
  balances: Array<{ clientId: string; currentQuantity: number }>
): Map<string, { itemCount: number; baseQuantity: number }> {
  const summaryByClientId = new Map<string, { itemCount: number; baseQuantity: number }>();

  for (const balance of balances) {
    const current = summaryByClientId.get(balance.clientId) ?? {
      itemCount: 0,
      baseQuantity: 0
    };

    if (balance.currentQuantity > 0) {
      current.itemCount += 1;
      current.baseQuantity += balance.currentQuantity;
    }

    summaryByClientId.set(balance.clientId, current);
  }

  return summaryByClientId;
}

function moneyToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}
