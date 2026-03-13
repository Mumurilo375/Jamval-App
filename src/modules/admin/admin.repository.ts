import { Prisma } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";

export class AdminRepository {
  async countProducts(db: DbClient = prisma): Promise<number> {
    return db.product.count();
  }

  async countActiveProducts(db: DbClient = prisma): Promise<number> {
    return db.product.count({
      where: {
        isActive: true
      }
    });
  }

  async countProductsWithoutCost(db: DbClient = prisma): Promise<number> {
    return db.product.count({
      where: {
        costPrice: null
      }
    });
  }

  async countActiveClients(db: DbClient = prisma): Promise<number> {
    return db.client.count({
      where: {
        isActive: true
      }
    });
  }

  async countCompletedVisits(db: DbClient = prisma): Promise<number> {
    return db.visit.count({
      where: {
        status: "COMPLETED"
      }
    });
  }

  async sumCompletedVisitTotalAmount(db: DbClient = prisma): Promise<Prisma.Decimal> {
    const result = await db.visit.aggregate({
      where: {
        status: "COMPLETED"
      },
      _sum: {
        totalAmount: true
      }
    });

    return result._sum.totalAmount ?? new Prisma.Decimal(0);
  }

  async sumReceivableAmountReceived(db: DbClient = prisma): Promise<Prisma.Decimal> {
    const result = await db.receivable.aggregate({
      _sum: {
        amountReceived: true
      }
    });

    return result._sum.amountReceived ?? new Prisma.Decimal(0);
  }

  async sumReceivableAmountOutstanding(db: DbClient = prisma): Promise<Prisma.Decimal> {
    const result = await db.receivable.aggregate({
      _sum: {
        amountOutstanding: true
      }
    });

    return result._sum.amountOutstanding ?? new Prisma.Decimal(0);
  }

  async sumCentralStockUnits(db: DbClient = prisma): Promise<number> {
    const result = await db.centralStockBalance.aggregate({
      _sum: {
        currentQuantity: true
      }
    });

    return result._sum.currentQuantity ?? 0;
  }

  async listActiveProductsWithStock(limit: number, db: DbClient = prisma) {
    const products = await db.product.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        sku: true,
        name: true,
        isActive: true,
        costPrice: true,
        centralStockBalance: {
          select: {
            currentQuantity: true
          }
        }
      }
    });

    return products
      .map((product) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        isActive: product.isActive,
        currentQuantity: product.centralStockBalance?.currentQuantity ?? 0,
        costPriceMissing: product.costPrice === null
      }))
      .sort((left, right) => {
        if (left.currentQuantity !== right.currentQuantity) {
          return left.currentQuantity - right.currentQuantity;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, limit);
  }

  async listProfitVisitItems(filters: { dateFrom?: Date; dateTo?: Date }, db: DbClient = prisma) {
    return db.visitItem.findMany({
      where: {
        visit: {
          status: "COMPLETED",
          ...(filters.dateFrom || filters.dateTo
            ? {
                visitedAt: {
                  ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
                  ...(filters.dateTo ? { lte: endOfDay(filters.dateTo) } : {})
                }
              }
            : {})
        },
        quantitySold: {
          gt: 0
        }
      },
      select: {
        id: true,
        productId: true,
        productSnapshotName: true,
        productSnapshotSku: true,
        quantitySold: true,
        unitPrice: true,
        costPriceSnapshot: true,
        subtotalAmount: true
      }
    });
  }

  async listProductsWithoutCost(limit: number, db: DbClient = prisma) {
    return db.product.findMany({
      where: {
        costPrice: null
      },
      select: {
        id: true,
        sku: true,
        name: true,
        basePrice: true,
        isActive: true
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: limit
    });
  }

  async listActiveProductsWithoutCentralStock(limit: number, db: DbClient = prisma) {
    const products = await db.product.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        sku: true,
        name: true,
        centralStockBalance: {
          select: {
            currentQuantity: true
          }
        }
      }
    });

    return products
      .map((product) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentQuantity: product.centralStockBalance?.currentQuantity ?? 0
      }))
      .filter((product) => product.currentQuantity <= 0)
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, limit);
  }

  async countActiveProductsWithoutCentralStock(db: DbClient = prisma): Promise<number> {
    const products = await db.product.findMany({
      where: {
        isActive: true
      },
      select: {
        centralStockBalance: {
          select: {
            currentQuantity: true
          }
        }
      }
    });

    return products.filter((product) => (product.centralStockBalance?.currentQuantity ?? 0) <= 0).length;
  }

  async listReceivablesWithOutstanding(db: DbClient = prisma) {
    return db.receivable.findMany({
      where: {
        amountOutstanding: {
          gt: 0
        }
      },
      select: {
        clientId: true,
        amountOutstanding: true,
        client: {
          select: {
            tradeName: true
          }
        }
      }
    });
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
