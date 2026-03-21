import { CentralStockMovementType, StockReferenceType } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { StockRepository } from "./stock.repository";
import type {
  CentralInitialLoadInput,
  CentralManualAdjustmentInput,
  CentralManualEntryInput,
  CentralMovementsQuery,
  CentralVisitOutflowsQuery
} from "./stock.types";

type CentralBalanceSummary = {
  productId: string;
  currentQuantity: number;
};

type BalanceEffect = "IN" | "OUT" | "NEUTRAL";

const MOVEMENT_TYPES_BY_KIND: Record<
  NonNullable<CentralMovementsQuery["movementKind"]>,
  CentralStockMovementType[]
> = {
  INITIAL_LOAD: [CentralStockMovementType.INITIAL_LOAD],
  MANUAL_ENTRY: [CentralStockMovementType.MANUAL_ENTRY],
  MANUAL_ADJUSTMENT: [
    CentralStockMovementType.MANUAL_ADJUSTMENT_IN,
    CentralStockMovementType.MANUAL_ADJUSTMENT_OUT
  ],
  RESTOCK_TO_CLIENT: [CentralStockMovementType.RESTOCK_TO_CLIENT],
  DIRECT_SALE_OUT: [CentralStockMovementType.DIRECT_SALE_OUT],
  DEFECTIVE_RETURN_LOG: [CentralStockMovementType.DEFECTIVE_RETURN_LOG]
};

export class StockService {
  constructor(private readonly repository = new StockRepository()) {}

  async listCentralBalances(productIds: string[]): Promise<CentralBalanceSummary[]> {
    const uniqueProductIds = Array.from(new Set(productIds));
    const balances = await this.repository.findCentralBalancesByProductIds(uniqueProductIds);
    const currentQuantityByProductId = new Map(
      balances.map((balance) => [balance.productId, Number(balance.currentQuantity)])
    );

    return uniqueProductIds.map((productId) => ({
      productId,
      currentQuantity: currentQuantityByProductId.get(productId) ?? 0
    }));
  }

  async getCentralOverview(): Promise<{
    summary: {
      productsWithStock: number;
      totalUnits: number;
      lastMovementAt: Date | null;
      canUseInitialLoad: boolean;
    };
    items: Array<{
      productId: string;
      sku: string;
      name: string;
      category: string | null;
      isActive: boolean;
      currentQuantity: number;
      lastMovementAt: Date | null;
    }>;
  }> {
    const [products, latestMovement, movementCount] = await Promise.all([
      this.repository.listProductsForOverview(),
      this.repository.findLatestCentralMovement(),
      this.repository.countCentralMovements()
    ]);

    const items = products.map((product) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      isActive: product.isActive,
      currentQuantity: product.centralStockBalance?.currentQuantity ?? 0,
      lastMovementAt: product.centralStockMovement[0]?.createdAt ?? null
    }));

    return {
      summary: {
        productsWithStock: items.filter((item) => item.currentQuantity > 0).length,
        totalUnits: items.reduce((sum, item) => sum + item.currentQuantity, 0),
        lastMovementAt: latestMovement?.createdAt ?? null,
        canUseInitialLoad: movementCount === 0
      },
      items
    };
  }

  async listCentralMovements(filters: CentralMovementsQuery): Promise<
    Array<{
      id: string;
      productId: string;
      productName: string;
      sku: string;
      movementType: CentralStockMovementType;
      movementLabel: string;
      balanceEffect: BalanceEffect;
      quantity: number;
      referenceType: StockReferenceType;
      referenceLabel: string;
      note: string | null;
      createdAt: Date;
    }>
  > {
    const movements = await this.repository.listCentralMovements({
      movementTypes: filters.movementKind ? MOVEMENT_TYPES_BY_KIND[filters.movementKind] : undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    });

    const visitIds = Array.from(
      new Set(
        movements
          .filter(
            (movement): movement is typeof movement & { referenceId: string } =>
              movement.referenceType === StockReferenceType.VISIT && Boolean(movement.referenceId)
          )
          .map((movement) => movement.referenceId)
      )
    );
    const visits = await this.repository.findVisitsByIds(visitIds);
    const visitById = new Map(visits.map((visit) => [visit.id, visit]));
    const search = filters.search?.trim().toLocaleLowerCase();

    return movements
      .map((movement) => {
        const visit = movement.referenceId ? visitById.get(movement.referenceId) : undefined;
        const referenceLabel = buildReferenceLabel(movement.referenceType, movement.movementType, visit);

        return {
          id: movement.id,
          productId: movement.productId,
          productName: movement.product.name,
          sku: movement.product.sku,
          movementType: movement.movementType,
          movementLabel: formatMovementLabel(movement.movementType),
          balanceEffect: getBalanceEffect(movement.movementType),
          quantity: movement.quantity,
          referenceType: movement.referenceType,
          referenceLabel,
          note: movement.note ?? null,
          createdAt: movement.createdAt
        };
      })
      .filter((movement) => {
        if (!search) {
          return true;
        }

        return [
          movement.productName,
          movement.sku,
          movement.movementLabel,
          movement.referenceLabel,
          movement.note ?? ""
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search);
      });
  }

  async listCentralVisitOutflows(filters: CentralVisitOutflowsQuery): Promise<
    Array<{
      visitId: string;
      visitCode: string;
      visitedAt: Date;
      clientId: string;
      clientTradeName: string;
      totalUnits: number;
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
      }>;
    }>
  > {
    const movements = await this.repository.listCentralVisitOutflowMovements();
    const visitIds = Array.from(
      new Set(
        movements
          .filter((movement): movement is typeof movement & { referenceId: string } => Boolean(movement.referenceId))
          .map((movement) => movement.referenceId)
      )
    );
    const visits = await this.repository.findVisitsByIds(visitIds);
    const visitById = new Map(visits.map((visit) => [visit.id, visit]));
    const outflowGroups = new Map<
      string,
      {
        visitId: string;
        visitCode: string;
        visitedAt: Date;
        clientId: string;
        clientTradeName: string;
        totalUnits: number;
        items: Map<
          string,
          {
            productId: string;
            productName: string;
            sku: string;
            quantity: number;
          }
        >;
      }
    >();

    for (const movement of movements) {
      if (!movement.referenceId) {
        continue;
      }

      const visit = visitById.get(movement.referenceId);

      if (!visit || !isWithinDateRange(visit.visitedAt, filters.dateFrom, filters.dateTo)) {
        continue;
      }

      const group =
        outflowGroups.get(visit.id) ??
        {
          visitId: visit.id,
          visitCode: visit.visitCode,
          visitedAt: visit.visitedAt,
          clientId: visit.clientId,
          clientTradeName: visit.client.tradeName,
          totalUnits: 0,
          items: new Map()
        };

      const existingItem = group.items.get(movement.productId);

      group.totalUnits += movement.quantity;
      group.items.set(movement.productId, {
        productId: movement.productId,
        productName: movement.product.name,
        sku: movement.product.sku,
        quantity: (existingItem?.quantity ?? 0) + movement.quantity
      });
      outflowGroups.set(visit.id, group);
    }

    return [...outflowGroups.values()]
      .sort((left, right) => right.visitedAt.getTime() - left.visitedAt.getTime())
      .map((group) => ({
        visitId: group.visitId,
        visitCode: group.visitCode,
        visitedAt: group.visitedAt,
        clientId: group.clientId,
        clientTradeName: group.clientTradeName,
        totalUnits: group.totalUnits,
        items: [...group.items.values()].sort((left, right) => left.productName.localeCompare(right.productName))
      }));
  }

  async createInitialLoad(input: CentralInitialLoadInput): Promise<void> {
    const items = normalizeBatchItems(input.items);
    const productIds = items.map((item) => item.productId);

    await prisma.$transaction(async (tx) => {
      const existingMovements = await this.repository.countCentralMovements(tx);

      if (existingMovements > 0) {
        throw new AppError(
          409,
          "INITIAL_LOAD_ALREADY_COMPLETED",
          "A carga inicial so pode ser usada no comeco da operacao. Depois disso, use Entrada manual."
        );
      }

      await this.ensureProductsExist(productIds, tx);

      const referenceId = crypto.randomUUID();

      for (const item of items) {
        await this.repository.increaseCentralBalance(item.productId, item.quantity, tx);
        await this.repository.createCentralMovement(
          {
            productId: item.productId,
            movementType: CentralStockMovementType.INITIAL_LOAD,
            quantity: item.quantity,
            referenceType: StockReferenceType.INITIAL_LOAD,
            referenceId,
            note: input.note
          },
          tx
        );
      }
    });
  }

  async createManualEntry(input: CentralManualEntryInput): Promise<void> {
    const items = normalizeBatchItems(input.items);
    const productIds = items.map((item) => item.productId);

    await prisma.$transaction(async (tx) => {
      await this.ensureProductsExist(productIds, tx);

      const referenceId = crypto.randomUUID();

      for (const item of items) {
        await this.repository.increaseCentralBalance(item.productId, item.quantity, tx);
        await this.repository.createCentralMovement(
          {
            productId: item.productId,
            movementType: CentralStockMovementType.MANUAL_ENTRY,
            quantity: item.quantity,
            referenceType: StockReferenceType.MANUAL,
            referenceId,
            note: input.note
          },
          tx
        );
      }
    });
  }

  async createManualAdjustment(input: CentralManualAdjustmentInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.ensureProductsExist([input.productId], tx);

      if (input.direction === "OUT") {
        await this.repository.decreaseCentralBalance(input.productId, input.quantity, tx);
      } else {
        await this.repository.increaseCentralBalance(input.productId, input.quantity, tx);
      }

      await this.repository.createCentralMovement(
        {
          productId: input.productId,
          movementType:
            input.direction === "OUT"
              ? CentralStockMovementType.MANUAL_ADJUSTMENT_OUT
              : CentralStockMovementType.MANUAL_ADJUSTMENT_IN,
          quantity: input.quantity,
          referenceType: StockReferenceType.ADJUSTMENT,
          referenceId: crypto.randomUUID(),
          note: input.reason
        },
        tx
      );
    });
  }

  private async ensureProductsExist(productIds: string[], tx: DbClient): Promise<void> {
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await this.repository.findProductsByIds(uniqueProductIds, tx);

    if (products.length !== uniqueProductIds.length) {
      throw new AppError(
        400,
        "INVALID_STOCK_PRODUCT",
        "Um ou mais produtos informados nao existem no cadastro.",
        {
          productIds: uniqueProductIds
        }
      );
    }
  }
}

function normalizeBatchItems(items: Array<{ productId: string; quantity: number }>): Array<{ productId: string; quantity: number }> {
  const normalized = items.map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity)
  }));
  const uniqueProductIds = new Set<string>();

  for (const item of normalized) {
    if (uniqueProductIds.has(item.productId)) {
      throw new AppError(
        400,
        "DUPLICATE_STOCK_PRODUCT",
        "Nao repita o mesmo produto no mesmo lancamento.",
        {
          productId: item.productId
        }
      );
    }

    uniqueProductIds.add(item.productId);
  }

  return normalized;
}

function buildReferenceLabel(
  referenceType: StockReferenceType,
  movementType: CentralStockMovementType,
  visit:
    | {
        visitCode: string;
        client: {
          tradeName: string;
        };
      }
    | undefined
): string {
  if (referenceType === StockReferenceType.VISIT && visit) {
    return `${visit.visitCode} · ${visit.client.tradeName}`;
  }

  if (movementType === CentralStockMovementType.INITIAL_LOAD) {
    return "Carga inicial";
  }

  if (movementType === CentralStockMovementType.MANUAL_ENTRY) {
    return "Entrada manual";
  }

  if (movementType === CentralStockMovementType.RESTOCK_TO_CLIENT) {
    return "Saida para cliente";
  }

  if (movementType === CentralStockMovementType.DIRECT_SALE_OUT) {
    return "Venda direta";
  }

  if (movementType === CentralStockMovementType.DEFECTIVE_RETURN_LOG) {
    return "Retorno com defeito";
  }

  return "Ajuste manual";
}

function formatMovementLabel(movementType: CentralStockMovementType): string {
  if (movementType === CentralStockMovementType.INITIAL_LOAD) {
    return "Carga inicial";
  }

  if (movementType === CentralStockMovementType.MANUAL_ENTRY) {
    return "Entrada manual";
  }

  if (movementType === CentralStockMovementType.MANUAL_ADJUSTMENT_IN) {
    return "Ajuste +";
  }

  if (movementType === CentralStockMovementType.MANUAL_ADJUSTMENT_OUT) {
    return "Ajuste -";
  }

  if (movementType === CentralStockMovementType.DEFECTIVE_RETURN_LOG) {
    return "Retorno com defeito registrado";
  }

  if (movementType === CentralStockMovementType.DIRECT_SALE_OUT) {
    return "Saida por venda direta";
  }

  return "Saida para cliente";
}

function getBalanceEffect(movementType: CentralStockMovementType): BalanceEffect {
  if (
    movementType === CentralStockMovementType.INITIAL_LOAD ||
    movementType === CentralStockMovementType.MANUAL_ENTRY ||
    movementType === CentralStockMovementType.MANUAL_ADJUSTMENT_IN
  ) {
    return "IN";
  }

  if (movementType === CentralStockMovementType.DEFECTIVE_RETURN_LOG) {
    return "NEUTRAL";
  }

  return "OUT";
}

function isWithinDateRange(value: Date, dateFrom?: Date, dateTo?: Date): boolean {
  if (dateFrom && value.getTime() < startOfDay(dateFrom).getTime()) {
    return false;
  }

  if (dateTo && value.getTime() > endOfDay(dateTo).getTime()) {
    return false;
  }

  return true;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
