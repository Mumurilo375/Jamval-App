import { CentralStockMovementType, Prisma, ReceivableStatus, VisitType } from "@prisma/client";

import { resolveReceiptCompanyProfile } from "../receipts/receipt-company-profile";
import { StockRepository } from "../stock/stock.repository";
import type { AdminDashboardQuery, AdminProfitQuery } from "./admin.types";
import { AdminRepository } from "./admin.repository";

const LIST_LIMIT = 5;
const LOW_STOCK_THRESHOLD = 5;

type CostConfidence = "CONFIRMED" | "REFERENCE" | "MISSING";
type CostCoverageStatus = CostConfidence | "MIXED";

type CoverageBucket = {
  soldUnits: number;
  visitItemsCount: number;
  revenueAmount: Prisma.Decimal;
};

type AggregatedProductProfit = {
  productId: string;
  sku: string;
  name: string;
  soldUnits: number;
  revenueAmount: Prisma.Decimal;
  confirmedSoldUnits: number;
  confirmedRevenueAmount: Prisma.Decimal;
  confirmedVisitItems: number;
  confirmedGrossProfitAmount: Prisma.Decimal;
  referenceSoldUnits: number;
  referenceRevenueAmount: Prisma.Decimal;
  referenceVisitItems: number;
  missingSoldUnits: number;
  missingRevenueAmount: Prisma.Decimal;
  missingVisitItems: number;
};

type ProfitItemWithResolvedCost = Awaited<ReturnType<AdminRepository["listProfitVisitItems"]>>[number] & {
  resolvedUnitCost: Prisma.Decimal | null;
  costConfidence: CostConfidence;
};

type DashboardPeriod = {
  range: "7d" | "30d" | "month" | "custom";
  label: string;
  dateFrom: Date;
  dateTo: Date;
};

type DashboardMovementSnapshot = {
  label: string;
  balanceEffect: "IN" | "OUT" | "NEUTRAL";
  createdAt: Date;
};

export class AdminService {
  constructor(
    private readonly repository = new AdminRepository(),
    private readonly stockRepository = new StockRepository()
  ) {}

  async getCompanyProfile() {
    const settings = await this.repository.findCompanyProfileSettings();
    return mapCompanyProfileResponse(settings);
  }

  async updateCompanyProfile(input: {
    companyName: string;
    document?: string | null;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    contactName?: string | null;
  }) {
    const settings = await this.repository.upsertCompanyProfileSettings(input);
    return mapCompanyProfileResponse(settings);
  }

  async getDashboard(filters: AdminDashboardQuery) {
    const period = resolveDashboardPeriod(filters);
    const [completedVisits, payments, totalPendingAmount, receivablesByStatus, profit, stockAlerts] = await Promise.all([
      this.repository.listCompletedVisits(period),
      this.repository.listPayments(period),
      this.repository.sumReceivableAmountOutstanding(),
      this.repository.summarizeReceivablesByStatus(),
      this.getProfit({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      }),
      this.buildDashboardStockAlerts()
    ]);
    const soldAmount = completedVisits.reduce((sum, visit) => sum.plus(visit.totalAmount), new Prisma.Decimal(0));
    const receivedAmount = payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));

    return {
      period: {
        range: period.range,
        label: period.label,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      },
      headline: {
        soldAmount: moneyToNumber(soldAmount),
        receivedAmount: moneyToNumber(receivedAmount),
        outstandingAmount: moneyToNumber(totalPendingAmount),
        confirmedGrossProfitAmount: profit.summary.estimatedGrossProfitAmount,
        averageTicket:
          completedVisits.length > 0
            ? moneyToNumber(soldAmount.div(completedVisits.length).toDecimalPlaces(2))
            : null,
        completedVisits: completedVisits.length
      },
      salesVsReceiptsSeries: buildSalesVsReceiptsSeries(period, completedVisits, payments),
      visitsSeries: buildVisitsSeries(period, completedVisits),
      receivablesStatus: mapReceivablesStatusSummary(receivablesByStatus),
      profitCoverage: profit.coverage,
      stockAlerts
    };
  }

  async getProfit(filters: AdminProfitQuery) {
    const items = await this.repository.listProfitVisitItems(filters);
    const resolvedItems = await this.resolveProfitItemsCost(items);
    const productMap = new Map<string, AggregatedProductProfit>();
    const coverage = createCoverageBuckets();
    let soldUnits = 0;
    let revenueAmount = new Prisma.Decimal(0);
    let confirmedGrossProfitAmount = new Prisma.Decimal(0);

    for (const item of resolvedItems) {
      const product =
        productMap.get(item.productId) ??
        {
          productId: item.productId,
          sku: item.productSnapshotSku,
          name: item.productSnapshotName,
          soldUnits: 0,
          revenueAmount: new Prisma.Decimal(0),
          confirmedSoldUnits: 0,
          confirmedRevenueAmount: new Prisma.Decimal(0),
          confirmedVisitItems: 0,
          confirmedGrossProfitAmount: new Prisma.Decimal(0),
          referenceSoldUnits: 0,
          referenceRevenueAmount: new Prisma.Decimal(0),
          referenceVisitItems: 0,
          missingSoldUnits: 0,
          missingRevenueAmount: new Prisma.Decimal(0),
          missingVisitItems: 0
        };

      soldUnits += item.quantitySold;
      revenueAmount = revenueAmount.plus(item.subtotalAmount);
      product.soldUnits += item.quantitySold;
      product.revenueAmount = product.revenueAmount.plus(item.subtotalAmount);

      const bucket = coverage[item.costConfidence];
      bucket.soldUnits += item.quantitySold;
      bucket.visitItemsCount += 1;
      bucket.revenueAmount = bucket.revenueAmount.plus(item.subtotalAmount);

      if (item.costConfidence === "CONFIRMED" && item.resolvedUnitCost !== null) {
        const grossProfit = new Prisma.Decimal(item.unitPrice)
          .minus(item.resolvedUnitCost)
          .mul(item.quantitySold)
          .toDecimalPlaces(2);

        confirmedGrossProfitAmount = confirmedGrossProfitAmount.plus(grossProfit);
        product.confirmedSoldUnits += item.quantitySold;
        product.confirmedRevenueAmount = product.confirmedRevenueAmount.plus(item.subtotalAmount);
        product.confirmedVisitItems += 1;
        product.confirmedGrossProfitAmount = product.confirmedGrossProfitAmount.plus(grossProfit);
      } else if (item.costConfidence === "REFERENCE") {
        product.referenceSoldUnits += item.quantitySold;
        product.referenceRevenueAmount = product.referenceRevenueAmount.plus(item.subtotalAmount);
        product.referenceVisitItems += 1;
      } else {
        product.missingSoldUnits += item.quantitySold;
        product.missingRevenueAmount = product.missingRevenueAmount.plus(item.subtotalAmount);
        product.missingVisitItems += 1;
      }

      productMap.set(item.productId, product);
    }

    const aggregatedProducts = [...productMap.values()];
    const allProductsWithoutCost = aggregatedProducts
      .filter((item) => item.missingVisitItems > 0)
      .sort((left, right) => right.missingRevenueAmount.comparedTo(left.missingRevenueAmount));
    const productsWithoutCost = allProductsWithoutCost
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.missingSoldUnits,
        revenueAmount: moneyToNumber(item.missingRevenueAmount),
        missingVisitItems: item.missingVisitItems
      }));
    const productsWithReferenceCost = aggregatedProducts
      .filter((item) => item.referenceVisitItems > 0)
      .sort((left, right) => right.referenceRevenueAmount.comparedTo(left.referenceRevenueAmount))
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.referenceSoldUnits,
        revenueAmount: moneyToNumber(item.referenceRevenueAmount),
        referenceVisitItems: item.referenceVisitItems
      }));
    const topProductsByProfit = aggregatedProducts
      .filter((item) => item.confirmedVisitItems > 0)
      .sort((left, right) => {
        const profitComparison = right.confirmedGrossProfitAmount.comparedTo(left.confirmedGrossProfitAmount);

        if (profitComparison !== 0) {
          return profitComparison;
        }

        return right.confirmedSoldUnits - left.confirmedSoldUnits;
      })
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.confirmedSoldUnits,
        revenueAmount: moneyToNumber(item.confirmedRevenueAmount),
        estimatedGrossProfitAmount: moneyToNumber(item.confirmedGrossProfitAmount),
        costCoverageStatus: getCostCoverageStatus(item)
      }));
    const topProductsBySales = aggregatedProducts
      .sort((left, right) => {
        if (right.soldUnits !== left.soldUnits) {
          return right.soldUnits - left.soldUnits;
        }

        return right.revenueAmount.comparedTo(left.revenueAmount);
      })
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.soldUnits,
        revenueAmount: moneyToNumber(item.revenueAmount),
        estimatedGrossProfitAmount:
          getCostCoverageStatus(item) === "CONFIRMED" ? moneyToNumber(item.confirmedGrossProfitAmount) : null,
        costCoverageStatus: getCostCoverageStatus(item)
      }));

    return {
      summary: {
        soldUnits,
        revenueAmount: moneyToNumber(revenueAmount),
        estimatedGrossProfitAmount:
          coverage.CONFIRMED.visitItemsCount > 0 ? moneyToNumber(confirmedGrossProfitAmount) : null,
        salesAmountWithoutCost: moneyToNumber(coverage.MISSING.revenueAmount),
        soldUnitsWithoutCost: coverage.MISSING.soldUnits,
        visitItemsWithoutCost: coverage.MISSING.visitItemsCount,
        distinctProductsWithoutCost: allProductsWithoutCost.length
      },
      coverage: {
        confirmed: mapCoverageBucket(coverage.CONFIRMED),
        reference: mapCoverageBucket(coverage.REFERENCE),
        missing: mapCoverageBucket(coverage.MISSING)
      },
      topProductsByProfit,
      topProductsBySales,
      productsWithoutCost,
      productsWithReferenceCost
    };
  }

  async getIndicators() {
    const [
      productsWithoutCost,
      productsWithoutCentralStock,
      profitItems,
      receivablesWithOutstanding,
      productsWithoutCostCount,
      productsWithoutCentralStockCount
    ] = await Promise.all([
      this.repository.listProductsWithoutCost(LIST_LIMIT),
      this.repository.listActiveProductsWithoutCentralStock(LIST_LIMIT),
      this.repository.listProfitVisitItems({}),
      this.repository.listReceivablesWithOutstanding(),
      this.repository.countProductsWithoutCost(),
      this.repository.countActiveProductsWithoutCentralStock()
    ]);

    const topSellingProducts = buildTopSellingProducts(profitItems).slice(0, LIST_LIMIT);
    const allClientsByOutstanding = buildTopClientsByOutstanding(receivablesWithOutstanding);
    const topClientsByOutstanding = allClientsByOutstanding.slice(0, LIST_LIMIT);

    return {
      counts: {
        productsWithoutCost: productsWithoutCostCount,
        productsWithoutCentralStock: productsWithoutCentralStockCount,
        clientsWithOutstanding: allClientsByOutstanding.length
      },
      productsWithoutCost: productsWithoutCost.map((product) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        basePrice: moneyToNumber(product.basePrice),
        isActive: product.isActive
      })),
      productsWithoutCentralStock,
      topSellingProducts,
      topClientsByOutstanding
    };
  }

  private async buildDashboardStockAlerts(): Promise<{
    zeroStockProducts: number;
    lowStockProducts: number;
    lastMovement: DashboardMovementSnapshot | null;
    topLowStock: Array<{
      productId: string;
      sku: string;
      name: string;
      currentQuantity: number;
      lastMovement: DashboardMovementSnapshot | null;
    }>;
  }> {
    const [products, latestMovement] = await Promise.all([
      this.stockRepository.listProductsForOverview(),
      this.stockRepository.findLatestCentralMovement()
    ]);
    const activeProducts = products.filter((product) => product.isActive);
    const zeroStockProducts = activeProducts.filter(
      (product) => (product.centralStockBalance?.currentQuantity ?? 0) <= 0
    ).length;
    const lowStockEntries = activeProducts
      .map((product) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentQuantity: product.centralStockBalance?.currentQuantity ?? 0,
        lastMovement: toDashboardMovementSnapshot(product.centralStockMovement[0] ?? null)
      }))
      .filter((product) => product.currentQuantity > 0 && product.currentQuantity <= LOW_STOCK_THRESHOLD)
      .sort((left, right) => {
        if (left.currentQuantity !== right.currentQuantity) {
          return left.currentQuantity - right.currentQuantity;
        }

        return left.name.localeCompare(right.name);
      });

    return {
      zeroStockProducts,
      lowStockProducts: lowStockEntries.length,
      lastMovement: toDashboardMovementSnapshot(latestMovement),
      topLowStock: lowStockEntries.slice(0, LIST_LIMIT)
    };
  }

  private async resolveProfitItemsCost(
    items: Awaited<ReturnType<AdminRepository["listProfitVisitItems"]>>
  ): Promise<ProfitItemWithResolvedCost[]> {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const latestCutoff = items.reduce<Date | null>((latest, item) => {
      const cutoff = item.visit.completedAt ?? item.visit.visitedAt;

      if (!latest || cutoff.getTime() > latest.getTime()) {
        return cutoff;
      }

      return latest;
    }, null);
    const entryCostHistory = latestCutoff
      ? await this.stockRepository.findEntryCostHistoryByProductIds(productIds, latestCutoff)
      : [];
    const entryCostHistoryByProductId = new Map<string, Array<{ unitCost: Prisma.Decimal; createdAt: Date }>>();

    for (const movement of entryCostHistory) {
      const history = entryCostHistoryByProductId.get(movement.productId) ?? [];

      history.push({
        unitCost: movement.unitCost,
        createdAt: movement.createdAt
      });
      entryCostHistoryByProductId.set(movement.productId, history);
    }

    return items.map((item) => {
      if (item.costPriceSnapshot !== null) {
        return {
          ...item,
          resolvedUnitCost: item.costPriceSnapshot,
          costConfidence: "CONFIRMED" as const
        };
      }

      const cutoff = item.visit.completedAt ?? item.visit.visitedAt;
      const entryCost = (entryCostHistoryByProductId.get(item.productId) ?? []).find(
        (movement) => movement.createdAt.getTime() <= cutoff.getTime()
      );

      if (entryCost) {
        return {
          ...item,
          resolvedUnitCost: entryCost.unitCost,
          costConfidence: "CONFIRMED" as const
        };
      }

      if (item.product.costPrice !== null) {
        return {
          ...item,
          resolvedUnitCost: item.product.costPrice,
          costConfidence: "REFERENCE" as const
        };
      }

      return {
        ...item,
        resolvedUnitCost: null,
        costConfidence: "MISSING" as const
      };
    });
  }
}

function mapCompanyProfileResponse(
  settings: Awaited<ReturnType<AdminRepository["findCompanyProfileSettings"]>>
) {
  const profile = resolveReceiptCompanyProfile(
    settings
      ? {
          companyName: settings.companyName,
          document: settings.document,
          phone: settings.phone,
          address: settings.address,
          email: settings.email,
          contactName: settings.contactName
        }
      : null
  );

  return {
    companyName: profile.name,
    document: profile.document,
    phone: profile.phone,
    address: profile.address,
    email: profile.email,
    contactName: profile.contactName
  };
}

function buildTopSellingProducts(
  items: Array<{
    productId: string;
    productSnapshotName: string;
    productSnapshotSku: string;
    quantitySold: number;
    subtotalAmount: Prisma.Decimal;
  }>
) {
  const aggregated = new Map<
    string,
    {
      productId: string;
      sku: string;
      name: string;
      soldUnits: number;
      revenueAmount: Prisma.Decimal;
    }
  >();

  for (const item of items) {
    const existing =
      aggregated.get(item.productId) ??
      {
        productId: item.productId,
        sku: item.productSnapshotSku,
        name: item.productSnapshotName,
        soldUnits: 0,
        revenueAmount: new Prisma.Decimal(0)
      };

    existing.soldUnits += item.quantitySold;
    existing.revenueAmount = existing.revenueAmount.plus(item.subtotalAmount);
    aggregated.set(item.productId, existing);
  }

  return [...aggregated.values()]
    .sort((left, right) => {
      if (right.soldUnits !== left.soldUnits) {
        return right.soldUnits - left.soldUnits;
      }

      return right.revenueAmount.comparedTo(left.revenueAmount);
    })
    .map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      soldUnits: item.soldUnits,
      revenueAmount: moneyToNumber(item.revenueAmount)
    }));
}

function buildTopClientsByOutstanding(
  receivables: Array<{
    clientId: string;
    amountOutstanding: Prisma.Decimal;
    client: {
      tradeName: string;
    };
  }>
) {
  const aggregated = new Map<
    string,
    {
      clientId: string;
      tradeName: string;
      outstandingAmount: Prisma.Decimal;
      receivableCount: number;
    }
  >();

  for (const receivable of receivables) {
    const existing =
      aggregated.get(receivable.clientId) ??
      {
        clientId: receivable.clientId,
        tradeName: receivable.client.tradeName,
        outstandingAmount: new Prisma.Decimal(0),
        receivableCount: 0
      };

    existing.outstandingAmount = existing.outstandingAmount.plus(receivable.amountOutstanding);
    existing.receivableCount += 1;
    aggregated.set(receivable.clientId, existing);
  }

  return [...aggregated.values()]
    .sort((left, right) => right.outstandingAmount.comparedTo(left.outstandingAmount))
    .map((item) => ({
      clientId: item.clientId,
      tradeName: item.tradeName,
      outstandingAmount: moneyToNumber(item.outstandingAmount),
      receivableCount: item.receivableCount
    }));
}

function resolveDashboardPeriod(filters: AdminDashboardQuery): DashboardPeriod {
  const today = new Date();

  if (filters.dateFrom || filters.dateTo) {
    const dateTo = filters.dateTo ? endOfUtcDay(filters.dateTo) : endOfUtcDay(today);
    const baseFrom = filters.dateFrom
      ? startOfUtcDay(filters.dateFrom)
      : startOfUtcDay(addUtcDays(dateTo, -29));

    return {
      range: "custom",
      label: "Periodo personalizado",
      dateFrom: baseFrom,
      dateTo
    };
  }

  if (filters.range === "7d") {
    return {
      range: "7d",
      label: "Ultimos 7 dias",
      dateFrom: startOfUtcDay(addUtcDays(today, -6)),
      dateTo: endOfUtcDay(today)
    };
  }

  if (filters.range === "month") {
    return {
      range: "month",
      label: "Mes atual",
      dateFrom: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0)),
      dateTo: endOfUtcDay(today)
    };
  }

  return {
    range: "30d",
    label: "Ultimos 30 dias",
    dateFrom: startOfUtcDay(addUtcDays(today, -29)),
    dateTo: endOfUtcDay(today)
  };
}

function buildSalesVsReceiptsSeries(
  period: DashboardPeriod,
  completedVisits: Array<{ visitedAt: Date; totalAmount: Prisma.Decimal }>,
  payments: Array<{ paidAt: Date; amount: Prisma.Decimal }>
) {
  const bucketMap = createPeriodBucketMap(period.dateFrom, period.dateTo);

  for (const visit of completedVisits) {
    const bucket = bucketMap.get(toUtcDateKey(visit.visitedAt));

    if (!bucket) {
      continue;
    }

    bucket.soldAmount = bucket.soldAmount.plus(visit.totalAmount);
  }

  for (const payment of payments) {
    const bucket = bucketMap.get(toUtcDateKey(payment.paidAt));

    if (!bucket) {
      continue;
    }

    bucket.receivedAmount = bucket.receivedAmount.plus(payment.amount);
  }

  return [...bucketMap.values()].map((bucket) => ({
    date: bucket.date,
    soldAmount: moneyToNumber(bucket.soldAmount),
    receivedAmount: moneyToNumber(bucket.receivedAmount)
  }));
}

function buildVisitsSeries(
  period: DashboardPeriod,
  completedVisits: Array<{ visitedAt: Date; visitType: VisitType }>
) {
  const bucketMap = createPeriodBucketMap(period.dateFrom, period.dateTo);

  for (const visit of completedVisits) {
    const bucket = bucketMap.get(toUtcDateKey(visit.visitedAt));

    if (!bucket) {
      continue;
    }

    bucket.completedVisits += 1;

    if (visit.visitType === VisitType.SALE) {
      bucket.saleVisits += 1;
    } else {
      bucket.consignmentVisits += 1;
    }
  }

  return [...bucketMap.values()].map((bucket) => ({
    date: bucket.date,
    completedVisits: bucket.completedVisits,
    saleVisits: bucket.saleVisits,
    consignmentVisits: bucket.consignmentVisits
  }));
}

function createPeriodBucketMap(dateFrom: Date, dateTo: Date) {
  const buckets = new Map<
    string,
    {
      date: string;
      soldAmount: Prisma.Decimal;
      receivedAmount: Prisma.Decimal;
      completedVisits: number;
      saleVisits: number;
      consignmentVisits: number;
    }
  >();

  for (let cursor = startOfUtcDay(dateFrom); cursor.getTime() <= dateTo.getTime(); cursor = addUtcDays(cursor, 1)) {
    const date = toUtcDateKey(cursor);

    buckets.set(date, {
      date,
      soldAmount: new Prisma.Decimal(0),
      receivedAmount: new Prisma.Decimal(0),
      completedVisits: 0,
      saleVisits: 0,
      consignmentVisits: 0
    });
  }

  return buckets;
}

function mapReceivablesStatusSummary(
  rows: Array<{ status: ReceivableStatus; count: number; amount: Prisma.Decimal }>
) {
  const byStatus = new Map(rows.map((row) => [row.status, row]));

  return {
    pending: {
      count: byStatus.get(ReceivableStatus.PENDING)?.count ?? 0,
      amount: moneyToNumber(byStatus.get(ReceivableStatus.PENDING)?.amount ?? new Prisma.Decimal(0))
    },
    partial: {
      count: byStatus.get(ReceivableStatus.PARTIAL)?.count ?? 0,
      amount: moneyToNumber(byStatus.get(ReceivableStatus.PARTIAL)?.amount ?? new Prisma.Decimal(0))
    },
    paid: {
      count: byStatus.get(ReceivableStatus.PAID)?.count ?? 0,
      amount: moneyToNumber(byStatus.get(ReceivableStatus.PAID)?.amount ?? new Prisma.Decimal(0))
    }
  };
}

function toDashboardMovementSnapshot(
  movement:
    | {
        movementType: CentralStockMovementType;
        createdAt: Date;
      }
    | null
): DashboardMovementSnapshot | null {
  if (!movement) {
    return null;
  }

  return {
    label: formatDashboardMovementLabel(movement.movementType),
    balanceEffect: getDashboardBalanceEffect(movement.movementType),
    createdAt: movement.createdAt
  };
}

function formatDashboardMovementLabel(movementType: CentralStockMovementType): string {
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

  if (movementType === CentralStockMovementType.DIRECT_SALE_OUT) {
    return "Saida por venda";
  }

  if (movementType === CentralStockMovementType.DEFECTIVE_RETURN_LOG) {
    return "Retorno com defeito";
  }

  return "Saida para cliente";
}

function getDashboardBalanceEffect(movementType: CentralStockMovementType): "IN" | "OUT" | "NEUTRAL" {
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

function toUtcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 0, 0, 0, 0));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function createCoverageBuckets(): Record<CostConfidence, CoverageBucket> {
  return {
    CONFIRMED: {
      soldUnits: 0,
      visitItemsCount: 0,
      revenueAmount: new Prisma.Decimal(0)
    },
    REFERENCE: {
      soldUnits: 0,
      visitItemsCount: 0,
      revenueAmount: new Prisma.Decimal(0)
    },
    MISSING: {
      soldUnits: 0,
      visitItemsCount: 0,
      revenueAmount: new Prisma.Decimal(0)
    }
  };
}

function getCostCoverageStatus(item: AggregatedProductProfit): CostCoverageStatus {
  const bucketsWithData = [
    item.confirmedVisitItems > 0,
    item.referenceVisitItems > 0,
    item.missingVisitItems > 0
  ].filter(Boolean).length;

  if (bucketsWithData > 1) {
    return "MIXED";
  }

  if (item.confirmedVisitItems > 0) {
    return "CONFIRMED";
  }

  if (item.referenceVisitItems > 0) {
    return "REFERENCE";
  }

  return "MISSING";
}

function mapCoverageBucket(bucket: CoverageBucket) {
  return {
    soldUnits: bucket.soldUnits,
    revenueAmount: moneyToNumber(bucket.revenueAmount),
    visitItemsCount: bucket.visitItemsCount
  };
}

function moneyToNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(2));
}
