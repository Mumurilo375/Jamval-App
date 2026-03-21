import type {
  CentralStockMovementType,
  Prisma,
  CentralStockBalance,
  CentralStockMovement,
  ConsignedStockBalance,
  ConsignedStockMovement,
  ConsignedStockMovementType,
  Product,
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
  async countCentralMovements(db: DbClient = prisma): Promise<number> {
    return db.centralStockMovement.count();
  }

  async findLatestCentralMovement(
    db: DbClient = prisma
  ): Promise<Pick<CentralStockMovement, "movementType" | "createdAt"> | null> {
    return db.centralStockMovement.findFirst({
      orderBy: [{ createdAt: "desc" }],
      select: {
        movementType: true,
        createdAt: true
      }
    });
  }

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

  async listProductsForOverview(
    db: DbClient = prisma
  ): Promise<
    Array<{
      id: string;
      sku: string;
      name: string;
      category: string | null;
      isActive: boolean;
      centralStockBalance: Pick<CentralStockBalance, "currentQuantity"> | null;
      centralStockMovement: Array<Pick<CentralStockMovement, "movementType" | "createdAt">>;
    }>
  > {
    return db.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        isActive: true,
        centralStockBalance: {
          select: {
            currentQuantity: true
          }
        },
        centralStockMovement: {
          select: {
            movementType: true,
            createdAt: true
          },
          orderBy: [{ createdAt: "desc" }],
          take: 1
        }
      },
      orderBy: [{ name: "asc" }]
    });
  }

  async findProductsByIds(productIds: string[], db: DbClient = prisma): Promise<Product[]> {
    if (productIds.length === 0) {
      return [];
    }

    return db.product.findMany({
      where: {
        id: {
          in: productIds
        }
      }
    });
  }

  async increaseCentralBalance(productId: string, quantity: number, db: DbClient = prisma): Promise<CentralStockBalance> {
    return db.centralStockBalance.upsert({
      where: {
        productId
      },
      update: {
        currentQuantity: {
          increment: quantity
        }
      },
      create: {
        productId,
        currentQuantity: quantity
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
      throw new AppError(409, "INSUFFICIENT_CENTRAL_STOCK", "O estoque central nao tem saldo suficiente para essa saida.", {
        productId,
        requiredQuantity: quantity
      });
    }
  }

  async listCentralMovements(
    filters: {
      movementTypes?: CentralStockMovementType[];
      dateFrom?: Date;
      dateTo?: Date;
    },
    db: DbClient = prisma
  ): Promise<
    Array<
      Pick<CentralStockMovement, "id" | "productId" | "movementType" | "quantity" | "referenceType" | "referenceId" | "note" | "createdAt"> & {
        product: Pick<Product, "name" | "sku">;
      }
    >
  > {
    const where: Prisma.CentralStockMovementWhereInput = {
      ...(filters.movementTypes && filters.movementTypes.length > 0
        ? {
            movementType: {
              in: filters.movementTypes
            }
          }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: endOfDay(filters.dateTo) } : {})
            }
          }
        : {})
    };

    return db.centralStockMovement.findMany({
      where,
      select: {
        id: true,
        productId: true,
        movementType: true,
        quantity: true,
        referenceType: true,
        referenceId: true,
        note: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });
  }

  async listCentralVisitOutflowMovements(
    db: DbClient = prisma
  ): Promise<
    Array<
      Pick<CentralStockMovement, "id" | "productId" | "quantity" | "referenceId" | "createdAt"> & {
        product: Pick<Product, "name" | "sku">;
      }
    >
  > {
    return db.centralStockMovement.findMany({
      where: {
        movementType: {
          in: ["RESTOCK_TO_CLIENT", "DIRECT_SALE_OUT"]
        },
        referenceType: "VISIT",
        referenceId: {
          not: null
        }
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        referenceId: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });
  }

  async findVisitsByIds(
    visitIds: string[],
    db: DbClient = prisma
  ): Promise<
    Array<{
      id: string;
      visitCode: string;
      visitedAt: Date;
      clientId: string;
      client: {
        tradeName: string;
      };
    }>
  > {
    if (visitIds.length === 0) {
      return [];
    }

    return db.visit.findMany({
      where: {
        id: {
          in: visitIds
        }
      },
      select: {
        id: true,
        visitCode: true,
        visitedAt: true,
        clientId: true,
        client: {
          select: {
            tradeName: true
          }
        }
      }
    });
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

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
