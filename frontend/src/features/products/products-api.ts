import { api } from "../../lib/api";
import { buildQuery } from "../../lib/query";
import type { Product } from "../../types/domain";

export type ProductListFilters = {
  search?: string;
  isActive?: boolean;
};

export type ProductPayload = {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  color?: string;
  voltage?: string;
  connectorType?: string;
  basePrice: number;
  costPrice?: number | null;
  isActive: boolean;
};

export function listProducts(filters: ProductListFilters) {
  return api.get<Product[]>(`/products${buildQuery(filters)}`);
}

export function getProduct(productId: string) {
  return api.get<Product>(`/products/${productId}`);
}

export function createProduct(payload: ProductPayload) {
  return api.post<Product>("/products", payload);
}

export function updateProduct(productId: string, payload: Partial<ProductPayload>) {
  return api.patch<Product>(`/products/${productId}`, payload);
}
