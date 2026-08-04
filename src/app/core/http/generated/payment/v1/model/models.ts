/**
 * kart-payment-service API — models (docs/services/kart-payment-service/api-contract.yaml).
 * This app only consumes `GET /v1/payments/{id}` and `POST /v1/payments/{id}/refund`
 * (SUP-1 direct refund initiation, SUP-4 Refund Request approval) — `chargePayment`
 * and the gateway webhook ingestion path are out of this app's scope.
 */

export interface Money {
  amount: number;
  currency: string;
}

export interface Problem {
  code: string;
  message: string;
  timestamp?: string;
}

export type PaymentIntentStatus = 'pending' | 'completed' | 'failed' | 'disputed';

export interface PaymentIntentView {
  paymentIntentId: string;
  orderId: string;
  status: PaymentIntentStatus;
  capturedAmount: Money;
  txnId?: string | null;
  totalRefunded: number;
  disputed: boolean;
  createdAt: string;
}

export type RefundStatus = 'pending' | 'succeeded' | 'failed';

export interface RefundView {
  refundId: string;
  paymentIntentId: string;
  amount: Money;
  status: RefundStatus;
  requestedAt: string;
}

export interface RefundPaymentRequest {
  amount: Money;
}
