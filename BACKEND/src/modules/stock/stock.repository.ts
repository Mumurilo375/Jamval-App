import {
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
  unitCost?: Prisma.Decimal | null;
  totalCost?: Prisma.Decimal | null;
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

let supportsCentralStockCostColumnsPromise: Promise<boolean> | null = null;
let supportsDirectSaleOutMovementTypePromise: Promise<boolean> | null = null;

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
        unitCost: Prisma.Decimal | null;
        totalCost: Prisma.Decimal | null;
        product: Pick<Product, "name" | "sku" | "category">;
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

    if (!(await supportsCentralStockCostColumns())) {
      return listCentralMovementsWithoutCosts(where, db);
    }

    try {
      return await db.centralStockMovement.findMany({
        where,
        select: {
          id: true,
          productId: true,
          movementType: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          referenceType: true,
          referenceId: true,
          note: true,
          createdAt: true,
          product: {
            select: {
              name: true,
              sku: true,
              category: true
            }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      });
    } catch (error) {
      if (!isMissingCentralStockCostColumnsError(error)) {
        throw error;
      }

      markCentralStockCostColumnsAsUnavailable();
      return listCentralMovementsWithoutCosts(where, db);
    }
  }

  async findLatestEntryCostsByProductIds(
    productIds: string[],
    completedBefore: Date,
    db: DbClient = prisma
  ): Promise<Array<{ productId: string; unitCost: Prisma.Decimal }>> {
    if (productIds.length === 0) {
      return [];
    }

    if (!(await supportsCentralStockCostColumns())) {
      return [];
    }

    let movements: Array<{ productId: string; unitCost: Prisma.Decimal | null; createdAt: Date }>;

    try {
      movements = await db.centralStockMovement.findMany({
        where: {
          productId: {
            in: productIds
          },
          movementType: {
            in: ["INITIAL_LOAD", "MANUAL_ENTRY"]
          },
          unitCost: {
            not: null
          },
          createdAt: {
            lte: completedBefore
          }
        },
        select: {
          productId: true,
          unitCost: true,
          createdAt: true
        },
        orderBy: [{ createdAt: "desc" }]
      });
    } catch (error) {
      if (isMissingCentralStockCostColumnsError(error)) {
        markCentralStockCostColumnsAsUnavailable();
        return [];
      }

      throw error;
    }

    const latestByProductId = new Map<string, Prisma.Decimal>();

    for (const movement of movements) {
      if (!movement.unitCost || latestByProductId.has(movement.productId)) {
        continue;
      }

      latestByProductId.set(movement.productId, movement.unitCost);
    }

    return [...latestByProductId.entries()].map(([productId, unitCost]) => ({
      productId,
      unitCost
    }));
  }

  async findEntryCostHistoryByProductIds(
    productIds: string[],
    completedBefore?: Date,
    db: DbClient = prisma
  ): Promise<Array<{ productId: string; unitCost: Prisma.Decimal; createdAt: Date }>> {
    if (productIds.length === 0) {
      return [];
    }

    if (!(await supportsCentralStockCostColumns())) {
      return [];
    }

    let movements: Array<{ productId: string; unitCost: Prisma.Decimal | null; createdAt: Date }>;

    try {
      movements = await db.centralStockMovement.findMany({
        where: {
          productId: {
            in: productIds
          },
          movementType: {
            in: ["INITIAL_LOAD", "MANUAL_ENTRY"]
          },
          unitCost: {
            not: null
          },
          ...(completedBefore
            ? {
                createdAt: {
                  lte: completedBefore
                }
              }
            : {})
        },
        select: {
          productId: true,
          unitCost: true,
          createdAt: true
        },
        orderBy: [{ productId: "asc" }, { createdAt: "desc" }]
      });
    } catch (error) {
      if (isMissingCentralStockCostColumnsError(error)) {
        markCentralStockCostColumnsAsUnavailable();
        return [];
      }

      throw error;
    }

    return movements
      .filter((movement): movement is { productId: string; unitCost: Prisma.Decimal; createdAt: Date } => Boolean(movement.unitCost))
      .map((movement) => ({
        productId: movement.productId,
        unitCost: movement.unitCost,
        createdAt: movement.createdAt
      }));
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
    const supportsDirectSaleOut = await supportsDirectSaleOutMovementType();

    try {
      return await db.centralStockMovement.findMany({
        where: {
          movementType: {
            in: supportsDirectSaleOut
              ? [CentralStockMovementType.RESTOCK_TO_CLIENT, CentralStockMovementType.DIRECT_SALE_OUT]
              : [CentralStockMovementType.RESTOCK_TO_CLIENT]
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
    } catch (error) {
      if (!isMissingDirectSaleOutMovementTypeError(error)) {
        throw error;
      }

      markDirectSaleOutMovementTypeAsUnavailable();
      return db.centralStockMovement.findMany({
        where: {
          movementType: "RESTOCK_TO_CLIENT",
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
    let compatibleData = data;

    if (data.movementType === CentralStockMovementType.DIRECT_SALE_OUT && !(await supportsDirectSaleOutMovementType())) {
      compatibleData = {
        ...data,
        movementType: CentralStockMovementType.RESTOCK_TO_CLIENT,
        note: buildDirectSaleCompatibilityNote(data.note)
      };
    }

    if (!(await supportsCentralStockCostColumns())) {
      return createCentralMovementWithoutCosts(compatibleData, db);
    }

    try {
      return await db.centralStockMovement.create({ data: compatibleData });
    } catch (error) {
      if (isMissingCentralStockCostColumnsError(error)) {
        markCentralStockCostColumnsAsUnavailable();
        return createCentralMovementWithoutCosts(compatibleData, db);
      }

      if (!shouldFallbackDirectSaleMovement(compatibleData, error)) {
        throw error;
      }

      markDirectSaleOutMovementTypeAsUnavailable();
      const fallbackData: CreateCentralStockMovementInput = {
        ...compatibleData,
        movementType: CentralStockMovementType.RESTOCK_TO_CLIENT,
        note: buildDirectSaleCompatibilityNote(compatibleData.note)
      };

      if (!(await supportsCentralStockCostColumns())) {
        return createCentralMovementWithoutCosts(fallbackData, db);
      }

      try {
        return await db.centralStockMovement.create({ data: fallbackData });
      } catch (fallbackError) {
        if (isMissingCentralStockCostColumnsError(fallbackError)) {
          markCentralStockCostColumnsAsUnavailable();
          return createCentralMovementWithoutCosts(fallbackData, db);
        }

        throw fallbackError;
      }
    }
  }

  async updateProductCostPrice(
    productId: string,
    costPrice: Prisma.Decimal,
    db: DbClient = prisma
  ): Promise<Product> {
    return db.product.update({
      where: {
        id: productId
      },
      data: {
        costPrice
      }
    });
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

function isMissingCentralStockCostColumnsError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = typeof error.meta?.column === "string" ? error.meta.column : null;

    if (error.code === "P2022") {
      return target === "CentralStockMovement.unitCost" || target === "CentralStockMovement.totalCost";
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("CentralStockMovement.unitCost") ||
    error.message.includes("CentralStockMovement.totalCost")
  );
}

function shouldFallbackDirectSaleMovement(
  data: CreateCentralStockMovementInput,
  error: unknown
): boolean {
  if (data.movementType !== CentralStockMovementType.DIRECT_SALE_OUT) {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("DIRECT_SALE_OUT") &&
    (error.message.includes("CentralStockMovementType") ||
      error.message.includes("invalid input value for enum") ||
      error.message.includes("Value") ||
      error.message.includes("enum"))
  );
}

function isMissingDirectSaleOutMovementTypeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("DIRECT_SALE_OUT") &&
    (error.message.includes("CentralStockMovementType") ||
      error.message.includes("invalid input value for enum") ||
      error.message.includes("Value") ||
      error.message.includes("enum"))
  );
}

function buildDirectSaleCompatibilityNote(note?: string): string {
  const prefix = "Venda direta";

  if (!note || note.trim().length === 0) {
    return prefix;
  }

  if (note.includes(prefix)) {
    return note;
  }

  return `${prefix} · ${note}`;
}

async function listCentralMovementsWithoutCosts(
  where: Prisma.CentralStockMovementWhereInput,
  db: DbClient
): Promise<
  Array<
    Pick<CentralStockMovement, "id" | "productId" | "movementType" | "quantity" | "referenceType" | "referenceId" | "note" | "createdAt"> & {
      unitCost: Prisma.Decimal | null;
      totalCost: Prisma.Decimal | null;
      product: Pick<Product, "name" | "sku" | "category">;
    }
  >
> {
  const movements = await db.centralStockMovement.findMany({
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
          sku: true,
          category: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return movements.map((movement) => ({
    ...movement,
    unitCost: null,
    totalCost: null
  }));
}

async function createCentralMovementWithoutCosts(
  data: CreateCentralStockMovementInput,
  db: DbClient
): Promise<CentralStockMovement> {
  const createdMovement = await db.centralStockMovement.create({
    data: {
      productId: data.productId,
      movementType: data.movementType,
      quantity: data.quantity,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      note: data.note
    },
    select: {
      id: true,
      productId: true,
      movementType: true,
      quantity: true,
      referenceType: true,
      referenceId: true,
      note: true,
      createdAt: true
    }
  });

  return {
    ...createdMovement,
    unitCost: null,
    totalCost: null
  } as CentralStockMovement;
}

async function supportsCentralStockCostColumns(): Promise<boolean> {
  if (!supportsCentralStockCostColumnsPromise) {
    supportsCentralStockCostColumnsPromise = loadCentralStockCostColumnsSupport().catch((error) => {
      supportsCentralStockCostColumnsPromise = null;
      throw error;
    });
  }

  return supportsCentralStockCostColumnsPromise;
}

async function supportsDirectSaleOutMovementType(): Promise<boolean> {
  if (!supportsDirectSaleOutMovementTypePromise) {
    supportsDirectSaleOutMovementTypePromise = loadDirectSaleOutMovementTypeSupport().catch((error) => {
      supportsDirectSaleOutMovementTypePromise = null;
      throw error;
    });
  }

  return supportsDirectSaleOutMovementTypePromise;
}

function markCentralStockCostColumnsAsUnavailable() {
  supportsCentralStockCostColumnsPromise = Promise.resolve(false);
}

function markDirectSaleOutMovementTypeAsUnavailable() {
  supportsDirectSaleOutMovementTypePromise = Promise.resolve(false);
}

async function loadCentralStockCostColumnsSupport(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) = lower('CentralStockMovement')
      AND lower(column_name) IN ('unitcost', 'totalcost')
  `;

  const columnNames = new Set(rows.map((row) => row.column_name.toLowerCase()));
  return columnNames.has("unitcost") && columnNames.has("totalcost");
}

async function loadDirectSaleOutMovementTypeSupport(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE lower(t.typname) = lower('CentralStockMovementType')
        AND e.enumlabel = 'DIRECT_SALE_OUT'
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}
