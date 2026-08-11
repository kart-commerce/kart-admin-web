import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { DataTableShell } from '../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../shared/ui/kart-input.directive';
import { extractErrorMessage } from '../../../core/auth/problem';
import { OrderStatus, OrderSummary } from '../../../core/http/generated/order/v1';
import { OrderManagementService } from '../data/order-management.service';

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

const ORDER_STATUSES: OrderStatus[] = ['Created', 'Reserved', 'Paid', 'Shipped', 'Delivered', 'FulfillmentException', 'Cancelled', 'Refunded'];

const PAGE_SIZE = 20;

/** Order Management (Admin) flow #7 — View Orders / Search / Filter. */
@Component({
  selector: 'kart-order-list',
  imports: [DataTableShell, Button, KartInput, FormsModule, RouterLink, DecimalPipe, DatePipe, Badge],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderList implements OnInit {
  private readonly orderManagementService = inject(OrderManagementService);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly statusBadgeVariant = STATUS_BADGE_VARIANT;

  protected readonly results = signal<OrderSummary[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected statusFilter: OrderStatus | '' = '';
  protected userIdFilter = '';
  protected createdFromFilter = '';
  protected createdToFilter = '';

  protected readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.orderManagementService
      .listOrders({
        status: this.statusFilter || undefined,
        userId: this.userIdFilter.trim() || undefined,
        createdFrom: this.createdFromFilter || undefined,
        createdTo: this.createdToFilter || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (paged) => {
          this.loading.set(false);
          this.results.set(paged.items);
          this.totalCount.set(paged.totalCount);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(extractErrorMessage(error, "Couldn't load orders."));
        },
      });
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() * this.pageSize < this.totalCount()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }
}
