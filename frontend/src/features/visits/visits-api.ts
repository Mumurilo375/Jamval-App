import { api } from "../../lib/api";
import type { Visit, VisitDetail } from "../../types/domain";

export type VisitListFilters = {
  clientId?: string;
  status?: "DRAFT" | "COMPLETED" | "CANCELLED";
};

export type VisitPayload = {
  clientId: string;
  visitedAt?: string;
  notes?: string;
  receivedAmountOnVisit?: number;
};

export type VisitItemDraftPayload = {
  productId: string;
  clientProductId?: string | null;
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  unitPrice?: number;
  suggestedRestockQuantity?: number;
  restockedQuantity?: number;
  notes?: string;
};

export type VisitItemPatchPayload = Partial<VisitItemDraftPayload>;
export type VisitInitialPaymentPayload = {
  paymentMethod: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER";
  reference?: string;
  notes?: string;
};

export type CentralStockBalanceSummary = {
  productId: string;
  currentQuantity: number;
};

function buildQuery(filters: VisitListFilters): string {
  const params = new URLSearchParams();

  if (filters.clientId) {
    params.set("clientId", filters.clientId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listVisits(filters: VisitListFilters) {
  return api.get<Visit[]>(`/visits${buildQuery(filters)}`);
}

export function getVisit(visitId: string) {
  return api.get<VisitDetail>(`/visits/${visitId}`);
}

export async function listCompletedVisitHistoryDetails(clientId: string, limit = 6) {
  const visits = await listVisits({ clientId, status: "COMPLETED" });
  const recentVisitIds = visits.slice(0, limit).map((visit) => visit.id);

  if (recentVisitIds.length === 0) {
    return [];
  }

  return Promise.all(recentVisitIds.map((visitId) => getVisit(visitId)));
}

export function createVisit(payload: VisitPayload) {
  return api.post<VisitDetail>("/visits", payload);
}

export function updateVisit(visitId: string, payload: Partial<VisitPayload>) {
  return api.patch<VisitDetail>(`/visits/${visitId}`, payload);
}

export function bulkUpsertVisitItems(visitId: string, items: VisitItemDraftPayload[]) {
  return api.post<VisitDetail>(`/visits/${visitId}/items/bulk-upsert`, { items });
}

export function patchVisitItem(visitId: string, itemId: string, payload: VisitItemPatchPayload) {
  return api.patch<VisitDetail>(`/visits/${visitId}/items/${itemId}`, payload);
}

export function deleteVisitItem(visitId: string, itemId: string) {
  return api.delete<VisitDetail>(`/visits/${visitId}/items/${itemId}`);
}

export function cancelVisit(visitId: string) {
  return api.post<VisitDetail>(`/visits/${visitId}/cancel`);
}

export function completeVisit(visitId: string, initialPayment?: VisitInitialPaymentPayload) {
  return api.post<VisitDetail>(`/visits/${visitId}/complete`, initialPayment ? { initialPayment } : {});
}

export function listCentralBalances(productIds: string[]) {
  const params = new URLSearchParams();
  params.set("productIds", productIds.join(","));

  return api.get<CentralStockBalanceSummary[]>(`/stock/central-balances?${params.toString()}`);
}
