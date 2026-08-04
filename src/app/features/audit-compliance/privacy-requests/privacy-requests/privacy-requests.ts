import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { Badge, BadgeVariant } from '../../../../shared/ui/badge/badge';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { PrivacyRequest, PrivacyRequestStatus } from '../../../../core/http/generated/admin/v1';
import { PrivacyRequestsService } from '../data/privacy-requests.service';

const STATUS_BADGE_VARIANT: Record<PrivacyRequestStatus, BadgeVariant> = {
  pending: 'warning',
  completed: 'success',
  rejected: 'danger',
};

/**
 * AUD-3: Privacy Requests — nested within the Audit &amp; Compliance
 * screen, gated at sub-view granularity by the `compliance` grant
 * (edge-cases.md "Privacy Requests View's Blanket 'Any Admin' Read Access
 * Over-Exposes GDPR-Sensitive Data" — GDPR Article 5(1)(c) data-minimization).
 * The parent route stays reachable by any Admin; only this panel is gated.
 */
@Component({
  selector: 'kart-privacy-requests',
  imports: [DataTableShell, Badge, DatePipe],
  templateUrl: './privacy-requests.html',
  styleUrl: './privacy-requests.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyRequests implements OnInit {
  private readonly service = inject(PrivacyRequestsService);

  protected readonly requests = signal<PrivacyRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusBadgeVariant = STATUS_BADGE_VARIANT;

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (page) => {
        this.loading.set(false);
        this.requests.set(page.items);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load privacy requests."));
      },
    });
  }
}
