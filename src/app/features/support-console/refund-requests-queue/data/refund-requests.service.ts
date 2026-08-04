import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Page,
  ReturnRequest,
  ReturnRequestApiService,
  ReturnRequestStatus,
} from '../../../../core/http/generated/order-returns/v1';

/**
 * SUP-3/SUP-4's data layer, against the **assumed** ReturnRequest contract
 * (see `contracts/kart-order-service-returns.assumed.api-contract.yaml`).
 * No client-side concurrency/live-validation layer is added on top of this
 * (design-decisions.md "Refund Request Approval — No Client-Side
 * Concurrency or Live-Validation Layer") — every Approve/Reject submit is
 * trusted entirely to the backend's own optimistic-concurrency guard and
 * live per-request cap check; this service only relays the call and lets
 * the queue/detail components present whatever the backend says.
 */
@Injectable({ providedIn: 'root' })
export class RefundRequestsService {
  private readonly returnRequestApi = inject(ReturnRequestApiService);

  list(status: ReturnRequestStatus = 'Requested'): Observable<Page<ReturnRequest>> {
    return this.returnRequestApi.list({ status });
  }

  get(returnRequestId: string): Observable<ReturnRequest> {
    return this.returnRequestApi.get(returnRequestId);
  }

  approve(returnRequestId: string, amount: { amount: number; currency: string }, ifMatchVersion: number): Observable<ReturnRequest> {
    return this.returnRequestApi.approve(returnRequestId, { amount }, ifMatchVersion, crypto.randomUUID());
  }

  reject(returnRequestId: string, reason: string, ifMatchVersion: number): Observable<ReturnRequest> {
    return this.returnRequestApi.reject(returnRequestId, { reason }, ifMatchVersion, crypto.randomUUID());
  }
}
