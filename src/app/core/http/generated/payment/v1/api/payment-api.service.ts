import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { PaymentIntentView, RefundPaymentRequest, RefundView } from '../model/models';

/**
 * Typed client for kart-payment-service's api-contract.yaml. `refundPayment`
 * is called under two distinct workflows in this app: SUP-1's direct
 * refund-initiation action, and SUP-4's Refund Request approval — the same
 * endpoint/permission surface/partial-refund mechanism either way (per that
 * contract's own description), capped at the Support Agent's own
 * per-order refund grant (requirement-spec.md §5) — enforced server-side,
 * this client does not gate the amount client-side beyond what SUP-1/SUP-4's
 * own screens already do for UX.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  getPaymentIntent(paymentIntentId: string): Observable<PaymentIntentView> {
    return this.http.get<PaymentIntentView>(`${this.basePath}/payments/${encodeURIComponent(paymentIntentId)}`);
  }

  refundPayment(paymentIntentId: string, request: RefundPaymentRequest, idempotencyKey: string): Observable<RefundView> {
    return this.http.post<RefundView>(
      `${this.basePath}/payments/${encodeURIComponent(paymentIntentId)}/refund`,
      request,
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) },
    );
  }
}
