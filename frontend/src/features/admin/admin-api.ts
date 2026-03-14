import { api } from "../../lib/api";

export type AdminDashboardSummary = {
  totalProducts: number;
  activeProducts: number;
  activeClients: number;
  completedVisits: number;
  totalSoldAmount: number;
  totalReceivedAmount: number;
  totalPendingAmount: number;
  centralStockUnits: number;
  productsWithoutCost: number;
};

export type AdminDashboardResponse = {
  summary: AdminDashboardSummary;
  lowStockProducts: Array<{
    productId: string;
    sku: string;
    name: string;
    currentQuantity: number;
    isActive: boolean;
    costPriceMissing: boolean;
  }>;
};

export type AdminProfitResponse = {
  summary: {
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number;
    salesAmountWithoutCost: number;
    soldUnitsWithoutCost: number;
    visitItemsWithoutCost: number;
    distinctProductsWithoutCost: number;
  };
  topProductsByProfit: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number;
  }>;
  topProductsBySales: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    estimatedGrossProfitAmount: number | null;
  }>;
  productsWithoutCost: Array<{
    productId: string;
    sku: string;
    name: string;
    soldUnits: number;
    revenueAmount: number;
    missingVisitItems: number;
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

export function getAdminDashboard() {
  return api.get<AdminDashboardResponse>("/admin/dashboard");
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
