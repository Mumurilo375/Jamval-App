import type {
  CentralStockBalance,
  CentralStockMovement,
  CentralStockMovementType,
  ConsignedStockBalance,
  ConsignedStockMovement,
  ConsignedStockMovementType,
  StockReferenceType
} from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";

type CreateCentralStockMovementInput = {
  productId: string;
  movementType: CentralStockMovementType;
  quantity: number;
  referenceType: StockReferenceType;
  referenceId: string;
  note?: string;
};

type CreateConsignedStockMovementInput = {
  clientId: string;
  productId: string;
  movementType: ConsignedStockMovementType;
  quantity: number;
  referenceType: StockReferenceType;
  referenceId: string;
  note?: string;
};

export class StockRepository {
  async findCentralBalancesByProductIds(productIds: string[], db: DbClient = prisma): Promise<CentralStockBalance[]> {
    if (productIds.length === 0) {
      return [];
    }

    return db.centralStockBalance.findMany({
      where: {
        productId: { in: productIds }
      }
    });
  }

  async decreaseCentralBalance(productId: string, quantity: number, db: DbClient = prisma): Promise<void> {
    if (quantity <= 0) {
      return;
    }

    const result = await db.centralStockBalance.updateMany({
      where: {
        productId,
        currentQuantity: {
          gte: quantity
        }
      },
      data: {
        currentQuantity: {
          decrement: quantity
        }
      }
    });

    if (result.count === 0) {
      throw new AppError(409, "INSUFFICIENT_CENTRAL_STOCK", "Central stock is insufficient for restock", {
        productId,
        requiredQuantity: quantity
      });
    }
  }

  async upsertConsignedBalance(
    clientId: string,
    productId: string,
    currentQuantity: number,
    db: DbClient = prisma
  ): Promise<ConsignedStockBalance> {
    return db.consignedStockBalance.upsert({
      where: {
        clientId_productId: {
          clientId,
          productId
        }
      },
      update: {
        currentQuantity
      },
      create: {
        clientId,
        productId,
        currentQuantity
      }
    });
  }

  async createCentralMovement(
    data: CreateCentralStockMovementInput,
    db: DbClient = prisma
  ): Promise<CentralStockMovement> {
    return db.centralStockMovement.create({ data });
  }

  async createConsignedMovement(
    data: CreateConsignedStockMovementInput,
    db: DbClient = prisma
  ): Promise<ConsignedStockMovement> {
    return db.consignedStockMovement.create({ data });
  }
}
