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
  dueDate?: string | null;
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
