/**
 * ReturnRequest API — models. **Assumed contract, not upstream-approved** —
 * see `../../../../../../contracts/kart-order-service-returns.assumed.api-contract.yaml`
 * for the full disclaimer (SUP-3/SUP-4's design source has no real
 * kart-order-service ticket/contract yet).
 */

export interface Money {
  amount: number;
  currency: string;
}

export type ReturnRequestStatus = 'Requested' | 'Approved' | 'Rejected' | 'RefundIssued';

export interface ReturnRequestLineItem {
  sku: string;
  qty: number;
}

export interface ReturnRequest {
  returnRequestId: string;
  orderId: string;
  customerId: string;
  requestedAmount: Money;
  lineItems: ReturnRequestLineItem[];
  status: ReturnRequestStatus;
  reason: string;
  requestedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  version: number;
}

export interface ApproveReturnRequestBody {
  amount: Money;
}

export interface RejectReturnRequestBody {
  reason: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Problem {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
