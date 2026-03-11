import { api } from "../../lib/api";
import type { ClientProduct } from "../../types/domain";

export type ClientCatalogPayload = {
  productId: string;
  currentUnitPrice: number;
  idealQuantity?: number | null;
  displayOrder?: number | null;
  isActive: boolean;
};

export function listClientCatalog(clientId: string, isActive?: boolean) {
  const query = isActive === undefined ? "" : `?isActive=${String(isActive)}`;
  return api.get<ClientProduct[]>(`/clients/${clientId}/products${query}`);
}

export function createClientCatalogItem(clientId: string, payload: ClientCatalogPayload) {
  return api.post<ClientProduct>(`/clients/${clientId}/products`, payload);
}

export function updateClientCatalogItem(clientId: string, clientProductId: string, payload: Partial<ClientCatalogPayload>) {
  return api.patch<ClientProduct>(`/clients/${clientId}/products/${clientProductId}`, payload);
}
