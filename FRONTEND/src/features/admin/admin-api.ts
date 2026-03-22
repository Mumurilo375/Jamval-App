import { api } from "../../lib/api";

export type AdminDashboardRange = "7d" | "30d" | "month";
export type DashboardBalanceEffect = "IN" | "OUT" | "NEUTRAL";

export type AdminDashboardResponse = {
  period: {
    range: AdminDashboardRange | "custom";
    label: string;
    dateFrom: string;
    dateTo: string;
  };
  headline: {
    soldAmount: number;
    receivedAmount: number;
    outstandingAmount: number;
    confirmedGrossProfitAmount: number | null;
    averageTicket: number | null;
    completedVisits: number;
  };
  salesVsReceiptsSeries: Array<{
    date: string;
    soldAmount: number;
    receivedAmount: number;
  }>;
  visitsSeries: Array<{
    date: string;
    completedVisits: number;
    saleVisits: number;
    consignmentVisits: number;
  }>;
  receivablesStatus: {
    pending: {
      count: number;
      amount: number;
    };
    partial: {
      count: number;
      amount: number;
    };
    paid: {
      count: number;
      amount: number;
    };
  };
  profitCoverage: {
    confirmed: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
    reference: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
    missing: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
  };
  stockAlerts: {
    zeroStockProducts: number;
    lowStockProducts: number;
    lastMovement: {
      label: string;
      balanceEffect: DashboardBalanceEffect;
      createdAt: string;
    } | null;
    topLowStock: Array<{
      productId: string;
      sku: string;
      name: string;
      currentQuantity: number;
      lastMovement: {
        label: string;
        balanceEffect: DashboardBalanceEffect;
        createdAt: string;
      } | null;
    }>;
  };
};

export type CostCoverageStatus = "CONFIRMED" | "REFERENCE" | "MISSING" | "MIXED";

export type AdminProfitResponse = {
  summary: {
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number | null;
    salesAmountWithoutCost: number;
    soldUnitsWithoutCost: number;
    visitItemsWithoutCost: number;
    distinctProductsWithoutCost: number;
  };
  coverage: {
    confirmed: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
    reference: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
    missing: {
      soldUnits: number;
      revenueAmount: number;
      visitItemsCount: number;
    };
  };
  topProductsByProfit: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number;
    costCoverageStatus: CostCoverageStatus;
  }>;
  topProductsBySales: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number | null;
    costCoverageStatus: CostCoverageStatus;
  }>;
  productsWithoutCost: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    missingVisitItems: number;
  }>;
  productsWithReferenceCost: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    referenceVisitItems: number;
  }>;
};

export type AdminIndicatorsResponse = {
  counts: {
    productsWithoutCost: number;
    productsWithoutCentralStock: number;
    clientsWithOutstanding: number;
  };
  productsWithoutCost: Array<{
    productId: string;
    sku: string;
    name: string;
    basePrice: number;
    isActive: boolean;
  }>;
  productsWithoutCentralStock: Array<{
    productId: string;
    sku: string;
    name: string;
    currentQuantity: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
  }>;
  topClientsByOutstanding: Array<{
    clientId: string;
    tradeName: string;
    outstandingAmount: number;
    receivableCount: number;
  }>;
};

export type AdminCompanyProfile = {
  companyName: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  contactName: string | null;
};

type ProfitFilters = {
  dateFrom?: string;
  dateTo?: string;
};

type DashboardFilters = {
  range?: AdminDashboardRange;
  dateFrom?: string;
  dateTo?: string;
};

export function getAdminDashboard(filters: DashboardFilters = {}) {
  const params = new URLSearchParams();

  if (filters.range) {
    params.set("range", filters.range);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const query = params.toString();
  return api.get<AdminDashboardResponse>(`/admin/dashboard${query ? `?${query}` : ""}`);
}

export function getAdminProfit(filters: ProfitFilters) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const query = params.toString();
  return api.get<AdminProfitResponse>(`/admin/profit${query ? `?${query}` : ""}`);
}

export function getAdminIndicators() {
  return api.get<AdminIndicatorsResponse>("/admin/indicators");
}

export function getAdminCompanyProfile() {
  return api.get<AdminCompanyProfile>("/admin/settings/company-profile");
}

export function updateAdminCompanyProfile(payload: AdminCompanyProfile) {
  return api.patch<AdminCompanyProfile>("/admin/settings/company-profile", payload);
}
