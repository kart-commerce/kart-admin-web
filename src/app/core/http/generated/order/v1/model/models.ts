/**
 * kart-order-service API — models (docs/services/kart-order-service/api-contract.yaml).
 * Order Management (Admin) flow #7 added `listOrders`/`getInvoice` (both
 * AdminOnly-gated on kart-order-service itself, reached via this app's own
 * Admin-role session same as `getOrder`/`resolveFulfillmentException`
 * already were) — `createOrder`/customer-initiated `cancelOrder` stay out
 * of this app's scope (kart-web's own).
 */

export type OrderStatus =
  | 'Created'
  | 'Reserved'
  | 'Paid'
  | 'Shipped'
  | 'Delivered'
  | 'FulfillmentException'
  | 'Cancelled'
  | 'Refunded';

export interface Money {
  amount: number;
  currency: string;
}

export interface Problem {
  code: string;
  message: string;
  timestamp?: string;
}

export interface OrderLineItemView {
  sku: string;
  qty: number;
  unitPrice: Money;
}

export interface ShippingAddress {
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface OrderView {
  orderId: string;
  userId: string;
  status: OrderStatus;
  items: OrderLineItemView[];
  totalAmount: Money;
  createdAt: string;
  shippingAddress?: ShippingAddress | null;
}

export type FulfillmentExceptionAction = 'retry' | 'cancel';

export interface ResolveFulfillmentExceptionRequest {
  action: FulfillmentExceptionAction;
}

/** Order Management (Admin) flow #7's list/search view — GET /v1/orders. */
export interface OrderSummary {
  orderId: string;
  userId: string;
  status: OrderStatus;
  totalAmount: Money;
  createdAt: string;
  updatedAt: string;
}

export interface PagedOrders {
  items: OrderSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface OrderSearchFilter {
  status?: OrderStatus;
  userId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}

/** Order Management (Admin) flow #7's "Generate Invoice" view — GET /v1/orders/{id}/invoice. Subtotal === total today (no separate tax/shipping-fee line exists yet on Order). */
export interface Invoice {
  invoiceNumber: string;
  orderId: string;
  userId: string;
  status: OrderStatus;
  items: OrderLineItemView[];
  subtotal: Money;
  total: Money;
  shippingAddress?: ShippingAddress | null;
  orderCreatedAt: string;
  issuedAt: string;
}
