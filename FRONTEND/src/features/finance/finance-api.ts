import { api } from "../../lib/api";
import type { PaymentMethod, PaymentRecord, ReceivableDetail, ReceivableListItem } from "../../types/domain";

export type ListReceivablesFilters = {
  clientId?: string;
};

export type CreateReceivablePaymentPayload = {
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
};

export type CreateReceivablePaymentResponse = {
  payment: PaymentRecord;
  receivable: ReceivableDetail;
};

function buildQuery(filters: ListReceivablesFilters): string {
  const params = new URLSearchParams();

  if (filters.clientId) {
    params.set("clientId", filters.clientId);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listReceivables(filters: ListReceivablesFilters = {}) {
  return api.get<ReceivableListItem[]>(`/receivables${buildQuery(filters)}`);
}

export function getReceivable(receivableId: string) {
  return api.get<ReceivableDetail>(`/receivables/${receivableId}`);
}

export function createReceivablePayment(receivableId: string, payload: CreateReceivablePaymentPayload) {
  return api.post<CreateReceivablePaymentResponse>(`/receivables/${receivableId}/payments`, payload);
}
