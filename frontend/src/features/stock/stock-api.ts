import { api } from "../../lib/api";

export type CentralOverview = {
  summary: {
    productsWithStock: number;
    totalUnits: number;
    lastMovement: {
      label: string;
      balanceEffect: "IN" | "OUT" | "NEUTRAL";
      createdAt: string;
    } | null;
    canUseInitialLoad: boolean;
  };
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    category: string | null;
    isActive: boolean;
    currentQuantity: number;
    lastMovement: {
      label: string;
      balanceEffect: "IN" | "OUT" | "NEUTRAL";
      createdAt: string;
    } | null;
  }>;
};

export type CentralMovementKind =
  | "INITIAL_LOAD"
  | "MANUAL_ENTRY"
  | "MANUAL_ADJUSTMENT"
  | "RESTOCK_TO_CLIENT"
  | "DIRECT_SALE_OUT"
  | "DEFECTIVE_RETURN_LOG";

export type CentralMovement = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string | null;
  sku: string;
  movementType:
    | "INITIAL_LOAD"
    | "MANUAL_ENTRY"
    | "MANUAL_ADJUSTMENT_IN"
    | "MANUAL_ADJUSTMENT_OUT"
    | "RESTOCK_TO_CLIENT"
    | "DIRECT_SALE_OUT"
    | "DEFECTIVE_RETURN_LOG";
  movementLabel: string;
  balanceEffect: "IN" | "OUT" | "NEUTRAL";
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: "VISIT" | "MANUAL" | "INITIAL_LOAD" | "ADJUSTMENT";
  referenceLabel: string;
  note: string | null;
  createdAt: string;
};

export type CentralVisitOutflowGroup = {
  visitId: string;
  visitCode: string;
  visitedAt: string;
  clientId: string;
  clientTradeName: string;
  totalUnits: number;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
  }>;
};

export type CentralMovementsFilters = {
  search?: string;
  movementKind?: CentralMovementKind;
  dateFrom?: string;
  dateTo?: string;
};

export type CentralVisitOutflowsFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type StockBatchPayload = {
  note?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
};

export type StockManualAdjustmentPayload = {
  productId: string;
  direction: "IN" | "OUT";
  quantity: number;
  reason: string;
};

function buildQuery(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getCentralOverview() {
  return api.get<CentralOverview>("/stock/central-overview");
}

export function listCentralMovements(filters: CentralMovementsFilters) {
  return api.get<CentralMovement[]>(
    `/stock/central-movements${buildQuery({
      search: filters.search,
      movementKind: filters.movementKind,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    })}`
  );
}

export function listCentralVisitOutflows(filters: CentralVisitOutflowsFilters) {
  return api.get<CentralVisitOutflowGroup[]>(
    `/stock/central-visit-outflows${buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    })}`
  );
}

export function createCentralInitialLoad(payload: StockBatchPayload) {
  return api.post<{ success: boolean }>("/stock/central-initial-loads", payload);
}

export function createCentralManualEntry(payload: StockBatchPayload) {
  return api.post<{ success: boolean }>("/stock/central-manual-entries", payload);
}

export function createCentralManualAdjustment(payload: StockManualAdjustmentPayload) {
  return api.post<{ success: boolean }>("/stock/central-manual-adjustments", payload);
}
