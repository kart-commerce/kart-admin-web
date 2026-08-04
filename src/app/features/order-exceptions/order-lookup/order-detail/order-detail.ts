import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge, BadgeVariant } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { OrderStatus, OrderView } from '../../../../core/http/generated/order/v1';
import { ResolveFulfillmentException } from '../../resolve-fulfillment-exception/resolve-fulfillment-exception/resolve-fulfillment-exception';
import { OrderLookupService } from '../data/order-lookup.service';

const STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  Created: 'neutral',
  Reserved: 'neutral',
  Paid: 'primary',
  Shipped: 'primary',
  Delivered: 'success',
  FulfillmentException: 'danger',
  Cancelled: 'neutral',
  Refunded: 'warning',
};

/** ORD-1: Order Lookup/Detail — read-only investigation view, for Admin. */
@Component({
  selector: 'kart-order-detail',
  imports: [FormsModule, KartInput, Button, Spinner, Alert, Card, Badge, DecimalPipe, DatePipe, ResolveFulfillmentException],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private readonly orderLookupService = inject(OrderLookupService);

  protected orderIdInput = '';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly order = signal<OrderView | null>(null);

  protected readonly statusBadgeVariant = STATUS_BADGE_VARIANT;

  lookup(): void {
    const orderId = this.orderIdInput.trim();
    if (!orderId) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.order.set(null);
    this.orderLookupService.getOrder(orderId).subscribe({
      next: (order) => {
        this.loading.set(false);
        this.order.set(order);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No order found with that ID.'));
      },
    });
  }

  onResolved(updated: OrderView): void {
    this.order.set(updated);
  }
}
