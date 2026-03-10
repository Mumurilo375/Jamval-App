import { Prisma, type VisitItem } from "@prisma/client";

import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type {
  BulkUpsertVisitItemsInput,
  CreateVisitInput,
  PatchVisitItemInput,
  UpdateVisitInput,
  VisitDraftItemInput,
  VisitListQuery,
  VisitWithItems
} from "./visit.types";
import {
  computeDraftVisitItem,
  ensureClientProductMatchesVisit,
  ensureReceivedAmountWithinTotal,
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

      const created = await this.repository.create(
        {
          visitCode: generateVisitCode(),
          clientId: input.clientId,
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
        const writeData = await this.buildDraftItemWriteData(visit.clientId, item, tx);
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
    item: VisitDraftItemInput,
    db: Prisma.TransactionClient
  ) {
    const product = await this.repository.findProductById(item.productId, db);

    if (!product) {
      throw new AppError(400, "INVALID_PRODUCT", "Product does not exist", { productId: item.productId });
    }

    const clientProduct = item.clientProductId
      ? await this.repository.findClientProductById(item.clientProductId, db)
      : await this.repository.findClientProductByClientAndProduct(visitClientId, item.productId, db);

    ensureClientProductMatchesVisit(visitClientId, item.productId, clientProduct);

    const unitPrice = item.unitPrice ?? Number(clientProduct.currentUnitPrice);

    return computeDraftVisitItem({
      product,
      clientProduct,
      clientProductId: item.clientProductId ?? null,
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
