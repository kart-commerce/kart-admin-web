import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { OrderView } from '../../../../core/http/generated/order/v1';
import { OrderLookupService } from '../../order-lookup/data/order-lookup.service';

/**
 * ORD-2: Fulfillment-exception resolution — reached from an order's own
 * detail view (ORD-1) once its status is `FulfillmentException`. Two legal
 * actions (kart-order-service's own contract): `retry` (resume the saga) or
 * `cancel` (release any held reservation + refund, then cancel).
 *
 * Gating note: unlike catalog-management/coupon-issuance/user-suspension/
 * inventory-replenishment, order/fulfillment actions have no matching entry
 * in kart-admin-service's `GrantCategory` enum — this screen is gated at
 * the route level only (`roleGuard('admin')`, order-exceptions.routes.ts),
 * not by a per-category `RequiresGrant` check, since none applies.
 */
@Component({
  selector: 'kart-resolve-fulfillment-exception',
  imports: [Card, Button, Alert],
  templateUrl: './resolve-fulfillment-exception.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolveFulfillmentException {
  private readonly orderLookupService = inject(OrderLookupService);

  readonly order = input.required<OrderView>();
  readonly resolved = output<OrderView>();

  protected readonly submittingAction = signal<'retry' | 'cancel' | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  resolve(action: 'retry' | 'cancel'): void {
    if (action === 'cancel' && !confirm('Cancel this order? A held reservation will be released and any charge refunded.')) {
      return;
    }

    this.submittingAction.set(action);
    this.errorMessage.set(null);
    this.orderLookupService.resolveFulfillmentException(this.order().orderId, action).subscribe({
      next: (updated) => {
        this.submittingAction.set(null);
        this.resolved.emit(updated);
      },
      error: (error: unknown) => {
        this.submittingAction.set(null);
        this.errorMessage.set(extractErrorMessage(error, 'Could not resolve this fulfillment exception. Try again.'));
      },
    });
  }
}
