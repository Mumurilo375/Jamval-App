import {
  Prisma,
  ReceivableStatus,
  StockReferenceType,
  VisitStatus,
  type ClientProduct
} from "@prisma/client";

import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import { PaymentRepository } from "../payments/payment.repository";
import { ReceivableRepository } from "../receivables/receivable.repository";
import { StockRepository } from "../stock/stock.repository";
import { VisitRepository } from "./visit.repository";
import type { CompleteVisitInput, VisitWithItems } from "./visit.types";
import {
  ensureReceivedAmountWithinTotal,
  ensureVisitCanBeCompleted,
  recomputeVisitItemForCompletion
} from "./visit.validators";

type CompletionVisitItem = {
  item: VisitWithItems["items"][number];
  quantitySold: number;
  subtotalAmount: Prisma.Decimal;
  resultingClientQuantity: number;
};

const VISIT_REFERENCE_TYPE = StockReferenceType.VISIT;

export class VisitCompletionService {
  constructor(
    private readonly visitRepository = new VisitRepository(),
    private readonly stockRepository = new StockRepository(),
    private readonly receivableRepository = new ReceivableRepository(),
    private readonly paymentRepository = new PaymentRepository()
  ) {}

  async complete(id: string, input: CompleteVisitInput): Promise<VisitWithItems> {
    await prisma.$transaction(async (tx) => {
      const visit = await this.visitRepository.findByIdWithItems(id, tx);

      if (!visit) {
        throw new NotFoundError("Visit not found", { id });
      }

      if (visit.status === VisitStatus.COMPLETED) {
        return;
      }

      ensureVisitCanBeCompleted(visit);

      const completedAt = new Date();
      const clientProductsById = await this.loadClientProductsById(visit.items, tx);
      const costSnapshotsByProductId = await this.loadCostSnapshotsByProductId(visit.items, completedAt, tx);
      const validatedItems = visit.items.map((item) =>
        this.validateVisitItem(visit.clientId, item, clientProductsById)
      );

      const totalAmount = validatedItems.reduce(
        (sum, item) => sum.plus(item.subtotalAmount),
        new Prisma.Decimal(0)
      );

      ensureReceivedAmountWithinTotal(visit.receivedAmountOnVisit, totalAmount);

      const receivedAmount = new Prisma.Decimal(visit.receivedAmountOnVisit);

      if (receivedAmount.greaterThan(0) && !input.initialPayment?.paymentMethod) {
        throw new AppError(
          400,
          "INITIAL_PAYMENT_METHOD_REQUIRED",
          "initialPayment.paymentMethod is required when receivedAmountOnVisit is greater than zero",
          { visitId: visit.id, receivedAmountOnVisit: receivedAmount.toString() }
        );
      }

      const requiredCentralStock = aggregateRequiredCentralStock(visit.visitType, validatedItems);
      await this.ensureCentralStockSufficient(requiredCentralStock, tx);

      const completionClaimed = await this.visitRepository.markAsCompleted(
        visit.id,
        totalAmount,
        completedAt,
        tx
      );

      if (completionClaimed === 0) {
        const currentVisit = await this.visitRepository.findById(visit.id, tx);

        if (!currentVisit) {
          throw new NotFoundError("Visit not found", { id: visit.id });
        }

        if (currentVisit.status === VisitStatus.COMPLETED) {
          return;
        }

        ensureVisitCanBeCompleted(currentVisit);

        throw new AppError(409, "VISIT_COMPLETION_CONFLICT", "Visit completion could not be claimed safely", {
          visitId: visit.id
        });
      }

      for (const item of validatedItems) {
        await this.visitRepository.updateItemComputedFields(
          item.item.id,
          {
            quantitySold: item.quantitySold,
            subtotalAmount: item.subtotalAmount,
            resultingClientQuantity: item.resultingClientQuantity,
            costPriceSnapshot: costSnapshotsByProductId.get(item.item.productId) ?? null
          },
          tx
        );
      }

      for (const item of validatedItems) {
        await this.applyStockEffects(visit, item, tx);
      }

      const receivable = await this.receivableRepository.create(
        {
          visitId: visit.id,
          clientId: visit.clientId,
          originalAmount: totalAmount,
          amountReceived: new Prisma.Decimal(0),
          amountOutstanding: totalAmount,
          status: ReceivableStatus.PENDING,
          dueDate: visit.dueDate
        },
        tx
      );

      if (receivedAmount.greaterThan(0)) {
        await this.paymentRepository.create(
          {
            receivableId: receivable.id,
            amount: receivedAmount,
            paymentMethod: input.initialPayment!.paymentMethod,
            reference: input.initialPayment?.reference,
            notes: input.initialPayment?.notes
          },
          tx
        );
      }

      await this.recalculateReceivable(receivable.id, totalAmount, tx);
    });

    return this.getVisitOrThrow(id);
  }

  private async getVisitOrThrow(id: string): Promise<VisitWithItems> {
    const visit = await this.visitRepository.findByIdWithItems(id);

    if (!visit) {
      throw new NotFoundError("Visit not found", { id });
    }

    return visit;
  }

  private async loadClientProductsById(
    items: VisitWithItems["items"],
    tx: Prisma.TransactionClient
  ): Promise<Map<string, ClientProduct>> {
    const clientProductIds = items
      .map((item) => item.clientProductId)
      .filter((clientProductId): clientProductId is string => Boolean(clientProductId));

    if (clientProductIds.length === 0) {
      return new Map();
    }

    const clientProducts = await this.visitRepository.findClientProductsByIds(clientProductIds, tx);

    return new Map(clientProducts.map((clientProduct) => [clientProduct.id, clientProduct]));
  }

  private async loadCostSnapshotsByProductId(
    items: VisitWithItems["items"],
    completedAt: Date,
    tx: Prisma.TransactionClient
  ): Promise<Map<string, Prisma.Decimal | null>> {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const latestEntryCosts = await this.stockRepository.findLatestEntryCostsByProductIds(productIds, completedAt, tx);
    const products = await this.visitRepository.findProductsByIds(productIds, tx);
    const latestCostByProductId = new Map(
      latestEntryCosts.map((movement) => [movement.productId, movement.unitCost])
    );

    return new Map(
      products.map((product) => [product.id, latestCostByProductId.get(product.id) ?? product.costPrice ?? null])
    );
  }

  private validateVisitItem(
    visitClientId: string,
    item: VisitWithItems["items"][number],
    clientProductsById: Map<string, ClientProduct>
  ): CompletionVisitItem {
    if (item.clientProductId) {
      const clientProduct = clientProductsById.get(item.clientProductId);

      if (!clientProduct) {
        throw new AppError(
          400,
          "INVALID_CLIENT_PRODUCT",
          "Visit item references a clientProductId that no longer exists",
          {
            itemId: item.id,
            clientProductId: item.clientProductId
          }
        );
      }

      if (clientProduct.clientId !== visitClientId || clientProduct.productId !== item.productId) {
        throw new AppError(
          400,
          "INVALID_CLIENT_PRODUCT",
          "Visit item clientProductId does not belong to the visit client and product",
          {
            itemId: item.id,
            clientProductId: item.clientProductId,
            clientId: visitClientId,
            productId: item.productId
          }
        );
      }
    }

    const recomputed = recomputeVisitItemForCompletion(item);

    return {
      item,
      ...recomputed
    };
  }

  private async ensureCentralStockSufficient(
    requiredStockByProduct: Map<string, number>,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const productIds = [...requiredStockByProduct.keys()];

    if (productIds.length === 0) {
      return;
    }

    const balances = await this.stockRepository.findCentralBalancesByProductIds(productIds, tx);
    const balanceByProductId = new Map(balances.map((balance) => [balance.productId, balance.currentQuantity]));

    const insufficientProducts = productIds
      .map((productId) => {
        const requiredQuantity = requiredStockByProduct.get(productId) ?? 0;
        const availableQuantity = balanceByProductId.get(productId) ?? 0;

        return {
          productId,
          requiredQuantity,
          availableQuantity
        };
      })
      .filter((item) => item.availableQuantity < item.requiredQuantity);

    if (insufficientProducts.length > 0) {
      throw new AppError(409, "INSUFFICIENT_CENTRAL_STOCK", "Central stock is insufficient for this visit output", {
        visitProducts: insufficientProducts
      });
    }
  }

  private async applyStockEffects(
    visit: VisitWithItems,
    item: CompletionVisitItem,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (visit.visitType === "SALE") {
      if (item.quantitySold <= 0) {
        return;
      }

      await this.stockRepository.decreaseCentralBalance(item.item.productId, item.quantitySold, tx);
      await this.stockRepository.createCentralMovement(
        {
          productId: item.item.productId,
          movementType: "DIRECT_SALE_OUT",
          quantity: item.quantitySold,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId: visit.id,
          note: `Direct sale ${visit.visitCode}`
        },
        tx
      );
      return;
    }

    const referenceId = visit.id;
    const movementNote = `Visit ${visit.visitCode}`;

    if (item.quantitySold > 0) {
      await this.stockRepository.createConsignedMovement(
        {
          clientId: visit.clientId,
          productId: item.item.productId,
          movementType: "SALE_OUT",
          quantity: item.quantitySold,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: movementNote
        },
        tx
      );
    }

    if (item.item.quantityDefectiveReturn > 0) {
      await this.stockRepository.createConsignedMovement(
        {
          clientId: visit.clientId,
          productId: item.item.productId,
          movementType: "DEFECTIVE_RETURN_OUT",
          quantity: item.item.quantityDefectiveReturn,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: movementNote
        },
        tx
      );
    }

    if (item.item.quantityLoss > 0) {
      await this.stockRepository.createConsignedMovement(
        {
          clientId: visit.clientId,
          productId: item.item.productId,
          movementType: "LOSS_OUT",
          quantity: item.item.quantityLoss,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: movementNote
        },
        tx
      );
    }

    if (item.item.restockedQuantity > 0) {
      await this.stockRepository.decreaseCentralBalance(item.item.productId, item.item.restockedQuantity, tx);

      await this.stockRepository.createCentralMovement(
        {
          productId: item.item.productId,
          movementType: "RESTOCK_TO_CLIENT",
          quantity: item.item.restockedQuantity,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: movementNote
        },
        tx
      );

      await this.stockRepository.createConsignedMovement(
        {
          clientId: visit.clientId,
          productId: item.item.productId,
          movementType: "RESTOCK_IN",
          quantity: item.item.restockedQuantity,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: movementNote
        },
        tx
      );
    }

    if (item.item.quantityDefectiveReturn > 0) {
      await this.stockRepository.createCentralMovement(
        {
          productId: item.item.productId,
          movementType: "DEFECTIVE_RETURN_LOG",
          quantity: item.item.quantityDefectiveReturn,
          referenceType: VISIT_REFERENCE_TYPE,
          referenceId,
          note: `Defective return logged from ${movementNote}`
        },
        tx
      );
    }

    await this.stockRepository.upsertConsignedBalance(
      visit.clientId,
      item.item.productId,
      item.resultingClientQuantity,
      tx
    );
  }

  private async recalculateReceivable(
    receivableId: string,
    originalAmount: Prisma.Decimal,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const { amountReceived, latestPaidAt } = await this.paymentRepository.aggregateByReceivable(receivableId, tx);
    const amountOutstanding = subtractMoney(originalAmount, amountReceived);
    const status = determineReceivableStatus(amountReceived, amountOutstanding);

    await this.receivableRepository.updateFinancialSnapshot(
      receivableId,
      {
        amountReceived,
        amountOutstanding,
        status,
        settledAt: status === ReceivableStatus.PAID ? latestPaidAt : null
      },
      tx
    );
  }
}

function aggregateRequiredCentralStock(
  visitType: VisitWithItems["visitType"],
  items: CompletionVisitItem[]
): Map<string, number> {
  const quantitiesByProduct = new Map<string, number>();

  for (const item of items) {
    const requiredQuantity = visitType === "SALE" ? item.quantitySold : item.item.restockedQuantity;

    if (requiredQuantity <= 0) {
      continue;
    }

    const currentQuantity = quantitiesByProduct.get(item.item.productId) ?? 0;
    quantitiesByProduct.set(item.item.productId, currentQuantity + requiredQuantity);
  }

  return quantitiesByProduct;
}

function subtractMoney(totalAmount: Prisma.Decimal, amountReceived: Prisma.Decimal): Prisma.Decimal {
  const difference = totalAmount.minus(amountReceived);

  if (difference.lessThan(0)) {
    return new Prisma.Decimal(0);
  }

  return difference;
}

function determineReceivableStatus(
  amountReceived: Prisma.Decimal,
  amountOutstanding: Prisma.Decimal
): ReceivableStatus {
  if (amountOutstanding.equals(0)) {
    return ReceivableStatus.PAID;
  }

  if (amountReceived.greaterThan(0)) {
    return ReceivableStatus.PARTIAL;
  }

  return ReceivableStatus.PENDING;
}
