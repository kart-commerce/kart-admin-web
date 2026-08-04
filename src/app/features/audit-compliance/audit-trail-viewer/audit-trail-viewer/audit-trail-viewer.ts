import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { AdminActionResult, GRANT_CATEGORIES } from '../../../../core/http/generated/admin/v1';
import { PrivacyRequests } from '../../privacy-requests/privacy-requests/privacy-requests';
import { AuditTrailService } from '../data/audit-trail.service';

/**
 * AUD-1: Audit Trail Viewer over `AdminActionPerformed` — readable by any
 * Admin regardless of category grant (requirement-spec.md §3.5). Also hosts
 * AUD-3's Privacy Requests panel, nested here and gated at sub-view
 * granularity by the `compliance` grant (design-decisions.md
 * "`compliance` Category Addition") — the route itself stays reachable by
 * any Admin.
 */
@Component({
  selector: 'kart-audit-trail-viewer',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, DataTableShell, Button, KartInput, RequiresGrant, PrivacyRequests, DatePipe],
  templateUrl: './audit-trail-viewer.html',
  styleUrl: './audit-trail-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTrailViewer implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AuditTrailService);

  protected readonly categories = GRANT_CATEGORIES;

  protected readonly filterForm = this.fb.nonNullable.group({
    adminId: [''],
    category: [''],
  });

  protected readonly actions = signal<AdminActionResult[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const { adminId, category } = this.filterForm.getRawValue();
    this.service
      .list({
        adminId: adminId || undefined,
        category: (category || undefined) as never,
      })
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.actions.set(page.items);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(extractErrorMessage(error, "Couldn't load the audit trail."));
        },
      });
  }
}
