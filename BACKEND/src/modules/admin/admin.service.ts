import { Prisma } from "@prisma/client";

import { resolveReceiptCompanyProfile } from "../receipts/receipt-company-profile";
import type { AdminProfitQuery } from "./admin.types";
import { AdminRepository } from "./admin.repository";

const LIST_LIMIT = 5;

type AggregatedProductProfit = {
  productId: string;
  sku: string;
  name: string;
  soldUnits: number;
  revenueAmount: Prisma.Decimal;
  estimatedGrossProfitAmount: Prisma.Decimal | null;
  missingVisitItems: number;
};

export class AdminService {
  constructor(private readonly repository = new AdminRepository()) {}

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

  async getDashboard() {
    const [
      totalProducts,
      activeProducts,
      activeClients,
      completedVisits,
      totalSoldAmount,
      totalReceivedAmount,
      totalPendingAmount,
      centralStockUnits,
      productsWithoutCost,
      lowStockProducts
    ] = await Promise.all([
      this.repository.countProducts(),
      this.repository.countActiveProducts(),
      this.repository.countActiveClients(),
      this.repository.countCompletedVisits(),
      this.repository.sumCompletedVisitTotalAmount(),
      this.repository.sumReceivableAmountReceived(),
      this.repository.sumReceivableAmountOutstanding(),
      this.repository.sumCentralStockUnits(),
      this.repository.countProductsWithoutCost(),
      this.repository.listActiveProductsWithStock(LIST_LIMIT)
    ]);

    return {
      summary: {
        totalProducts,
        activeProducts,
        activeClients,
        completedVisits,
        totalSoldAmount: moneyToNumber(totalSoldAmount),
        totalReceivedAmount: moneyToNumber(totalReceivedAmount),
        totalPendingAmount: moneyToNumber(totalPendingAmount),
        centralStockUnits,
        productsWithoutCost
      },
      lowStockProducts
    };
  }

  async getProfit(filters: AdminProfitQuery) {
    const items = await this.repository.listProfitVisitItems(filters);
    const productMap = new Map<string, AggregatedProductProfit>();
    let soldUnits = 0;
    let revenueAmount = new Prisma.Decimal(0);
    let estimatedGrossProfitAmount = new Prisma.Decimal(0);
    let salesAmountWithoutCost = new Prisma.Decimal(0);
    let soldUnitsWithoutCost = 0;
    let visitItemsWithoutCost = 0;

    for (const item of items) {
      const existing =
        productMap.get(item.productId) ??
        {
          productId: item.productId,
          sku: item.productSnapshotSku,
          name: item.productSnapshotName,
          soldUnits: 0,
          revenueAmount: new Prisma.Decimal(0),
          estimatedGrossProfitAmount: new Prisma.Decimal(0),
          missingVisitItems: 0
        };

      soldUnits += item.quantitySold;
      revenueAmount = revenueAmount.plus(item.subtotalAmount);
      existing.soldUnits += item.quantitySold;
      existing.revenueAmount = existing.revenueAmount.plus(item.subtotalAmount);

      if (item.costPriceSnapshot === null) {
        salesAmountWithoutCost = salesAmountWithoutCost.plus(item.subtotalAmount);
        soldUnitsWithoutCost += item.quantitySold;
        visitItemsWithoutCost += 1;
        existing.missingVisitItems += 1;
        existing.estimatedGrossProfitAmount = null;
      } else {
        const grossProfit = new Prisma.Decimal(item.unitPrice)
          .minus(item.costPriceSnapshot)
          .mul(item.quantitySold)
          .toDecimalPlaces(2);

        estimatedGrossProfitAmount = estimatedGrossProfitAmount.plus(grossProfit);

        if (existing.estimatedGrossProfitAmount !== null) {
          existing.estimatedGrossProfitAmount = existing.estimatedGrossProfitAmount.plus(grossProfit);
        }
      }

      productMap.set(item.productId, existing);
    }

    const aggregatedProducts = [...productMap.values()];
    const allProductsWithoutCost = aggregatedProducts
      .filter((item) => item.missingVisitItems > 0)
      .sort((left, right) => right.revenueAmount.comparedTo(left.revenueAmount));
    const productsWithoutCost = allProductsWithoutCost
      .sort((left, right) => right.revenueAmount.comparedTo(left.revenueAmount))
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.soldUnits,
        revenueAmount: moneyToNumber(item.revenueAmount),
        missingVisitItems: item.missingVisitItems
      }));
    const topProductsByProfit = aggregatedProducts
      .filter((item) => item.estimatedGrossProfitAmount !== null)
      .sort((left, right) => {
        const profitComparison = right.estimatedGrossProfitAmount!.comparedTo(left.estimatedGrossProfitAmount!);

        if (profitComparison !== 0) {
          return profitComparison;
        }

        return right.soldUnits - left.soldUnits;
      })
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        soldUnits: item.soldUnits,
        revenueAmount: moneyToNumber(item.revenueAmount),
        estimatedGrossProfitAmount: moneyToNumber(item.estimatedGrossProfitAmount)
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
        estimatedGrossProfitAmount: moneyToNumber(item.estimatedGrossProfitAmount)
      }));

    return {
      summary: {
        soldUnits,
        revenueAmount: moneyToNumber(revenueAmount),
        estimatedGrossProfitAmount: moneyToNumber(estimatedGrossProfitAmount),
        salesAmountWithoutCost: moneyToNumber(salesAmountWithoutCost),
        soldUnitsWithoutCost,
        visitItemsWithoutCost,
        distinctProductsWithoutCost: allProductsWithoutCost.length
      },
      topProductsByProfit,
      topProductsBySales,
      productsWithoutCost
    };
  }

  async getIndicators() {
    const [productsWithoutCost, productsWithoutCentralStock, profitItems, receivablesWithOutstanding, productsWithoutCostCount, productsWithoutCentralStockCount] =
      await Promise.all([
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

function moneyToNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(2));
}
