import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { ReturnRequest } from '../../../../core/http/generated/order-returns/v1';
import { RefundRequestsService } from '../data/refund-requests.service';

/**
 * SUP-3: Refund Requests queue — worklist of customer-submitted
 * ReturnRequests that failed the auto-approval fast path
 * (checkout-and-refunds.md §B.4). No live push (architecture.md marks
 * WS/SSE optional, not adopted for this feature) — a manual Refresh reflects
 * edge-cases.md's "friendly already-resolved message + refresh" resolution
 * for the concurrent-approval race.
 */
@Component({
  selector: 'kart-refund-requests-queue',
  imports: [DataTableShell, Button, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './refund-requests-queue.html',
  styleUrl: './refund-requests-queue.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundRequestsQueue implements OnInit {
  private readonly service = inject(RefundRequestsService);

  protected readonly requests = signal<ReturnRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.list('Requested').subscribe({
      next: (page) => {
        this.loading.set(false);
        this.requests.set(page.items);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load the Refund Requests queue."));
      },
    });
  }
}
