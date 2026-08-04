import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { OrderApiService, OrderView } from '../../../../core/http/generated/order/v1';
import { PaymentApiService, PaymentIntentView } from '../../../../core/http/generated/payment/v1';

/**
 * SUP-1's data layer. Order lookup reuses the same `OrderApiService` ORD-1
 * uses (read-only, no fulfillment-exception action here — that's Admin-only
 * per requirement-spec.md §3.2 vs §3.3). Refund initiation calls
 * kart-payment-service's own `POST /payments/{id}/refund` directly — the
 * same endpoint/permission surface SUP-4's Refund Request approval uses,
 * per checkout-and-refunds.md §B.5.
 *
 * Gap note: neither `OrderView` nor any exposed read endpoint links an order
 * to its `PaymentIntent` id — this app has no way to derive one from the
 * other. `SupportOrderLookup`'s refund panel therefore asks the Support
 * Agent to enter the known Payment Intent id directly (e.g. from a support
 * ticket), the same "no directory/search endpoint, so we ask for the known
 * id" pattern this app already uses for IDN-1/SUP-2's user lookups.
 */
@Injectable({ providedIn: 'root' })
export class SupportOrderLookupService {
  private readonly orderApi = inject(OrderApiService);
  private readonly paymentApi = inject(PaymentApiService);

  getOrder(orderId: string): Observable<OrderView> {
    return this.orderApi.getOrder(orderId);
  }

  getPaymentIntent(paymentIntentId: string): Observable<PaymentIntentView> {
    return this.paymentApi.getPaymentIntent(paymentIntentId);
  }

  initiateRefund(paymentIntentId: string, amount: { amount: number; currency: string }): Observable<void> {
    return this.paymentApi.refundPayment(paymentIntentId, { amount }, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
