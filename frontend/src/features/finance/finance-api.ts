import { api } from "../../lib/api";
import { buildQuery } from "../../lib/query";
import type { PaymentMethod, PaymentRecord, ReceivableDetail, ReceivableListItem, ReceivableStatus } from "../../types/domain";

export type ListReceivablesFilters = {
  clientId?: string;
  status?: ReceivableStatus;
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

export function listReceivables(filters: ListReceivablesFilters = {}) {
  return api.get<ReceivableListItem[]>(`/receivables${buildQuery(filters)}`);
}

export function getReceivable(receivableId: string) {
  return api.get<ReceivableDetail>(`/receivables/${receivableId}`);
}

export function createReceivablePayment(receivableId: string, payload: CreateReceivablePaymentPayload) {
  return api.post<CreateReceivablePaymentResponse>(`/receivables/${receivableId}/payments`, payload);
}
