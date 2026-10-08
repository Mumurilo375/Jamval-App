import { api } from "../../lib/api";
import { buildQuery } from "../../lib/query";
import type { Client } from "../../types/domain";

export type ClientListFilters = {
  search?: string;
  isActive?: boolean;
};

export type ClientPayload = {
  tradeName: string;
  legalName?: string;
  documentNumber?: string;
  stateRegistration?: string;
  contactName?: string;
  phone?: string;
  addressLine?: string;
  addressCity?: string;
  addressState?: string;
  addressZipcode?: string;
  notes?: string;
  visitCycleDays?: number;
  requiresInvoice: boolean;
  isActive: boolean;
};

export function listClients(filters: ClientListFilters) {
  return api.get<Client[]>(`/clients${buildQuery(filters)}`);
}

export function getClient(clientId: string) {
  return api.get<Client>(`/clients/${clientId}`);
}

export function createClient(payload: ClientPayload) {
  return api.post<Client>("/clients", payload);
}

export function updateClient(clientId: string, payload: Partial<ClientPayload>) {
  return api.patch<Client>(`/clients/${clientId}`, payload);
}
