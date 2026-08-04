/**
 * kart-product-service API — models (contracts/kart-product-service.api-contract.yaml).
 * This app only consumes `GET /v1/products/{sku}` (read, before/after an
 * admin write) — the list read path is kart-search-service's `GET /v1/search`
 * instead (see ../../search/v1), since kart-product-service exposes no list
 * endpoint of its own. Writes go through kart-admin-service's `/admin/products/*`
 * proxy (CAT-1's design source), not this client.
 */

export interface Money {
  amount: number;
  currency: string;
}

export interface ProductAttributes {
  size?: string | null;
  color?: string | null;
  extendedAttributes?: Record<string, unknown>;
}

export interface RatingSummary {
  avg: number;
  count: number;
}

export type ProductStatus = 'Active' | 'Discontinued';

export interface ProductResponse {
  sku: string;
  name: string;
  description?: string;
  category?: { id?: string; name?: string };
  brand?: string;
  price: Money;
  status: ProductStatus;
  attributes?: ProductAttributes;
  ratingSummary?: RatingSummary;
  lastUpdatedAt: string;
}
