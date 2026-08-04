/**
 * kart-order-service API — models (docs/services/kart-order-service/api-contract.yaml).
 * This app only calls the read (`getOrder`) and admin-only
 * (`resolveFulfillmentException`) paths — `createOrder`/`cancelOrder` are
 * customer-facing (kart-web) and out of this app's scope.
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

export interface OrderView {
  orderId: string;
  userId: string;
  status: OrderStatus;
  items: OrderLineItemView[];
  totalAmount: Money;
  createdAt: string;
}

export type FulfillmentExceptionAction = 'retry' | 'cancel';

export interface ResolveFulfillmentExceptionRequest {
  action: FulfillmentExceptionAction;
}
