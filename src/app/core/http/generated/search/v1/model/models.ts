/**
 * kart-search-service API — models (contracts/kart-search-service.api-contract.yaml).
 * CAT-1's product list read path — an empty `q` browses all Active products
 * (that service's own contract: "Omitted or empty means 'browse all,
 * filtered/sorted only' — a valid request, not an error"), since
 * kart-product-service itself exposes no list endpoint.
 */

export interface Money {
  amount: number;
  currency: string;
}

export interface CategoryRef {
  categoryId: string;
  categoryName?: string | null;
}

export interface RatingSummary {
  avg: number;
  count: number;
}

export interface SearchResultItem {
  sku: string;
  name: string;
  description?: string;
  brand: string;
  category: CategoryRef;
  price: Money;
  availability: 'Active';
  rating: RatingSummary;
  size?: string | null;
  color?: string | null;
}

export interface FacetBucket {
  value: string;
  count: number;
}

export interface Facets {
  category?: FacetBucket[];
  price?: FacetBucket[];
  rating?: FacetBucket[];
}

export interface Pagination {
  page: number;
  size: number;
  totalHits: number;
  totalHitsIsApproximate: boolean;
}

export interface SearchResponse {
  results: SearchResultItem[];
  facets: Facets;
  pagination: Pagination;
  truncated: boolean;
  degradedFacets?: string[];
}

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';
