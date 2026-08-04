import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { extractErrorCode, extractErrorMessage } from '../../../../core/auth/problem';
import { ReturnRequest } from '../../../../core/http/generated/order-returns/v1';
import { RefundRequestsService } from '../../refund-requests-queue/data/refund-requests.service';

/**
 * SUP-4: Refund Request Approve/Reject. No client-side lock or live cap
 * re-fetch (design-decisions.md "Refund Request Approval — No Client-Side
 * Concurrency or Live-Validation Layer") — both edge cases this ticket's
 * design source names are handled purely by presenting the backend's own
 * rejection well:
 *  - "Concurrent Support Agents Double-Approving" → a 409 here is shown as
 *    "already resolved" and the detail is refreshed.
 *  - "Support Agent's Refund-Approval Cap Changes Between Viewing and
 *    Approving" → a 403 here is shown as Admin-escalation-required.
 */
@Component({
  selector: 'kart-refund-request-approval',
  imports: [ReactiveFormsModule, RouterLink, Card, FormField, KartInput, Button, Alert, Spinner, DecimalPipe, DatePipe],
  templateUrl: './refund-request-approval.html',
  styleUrl: './refund-request-approval.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundRequestApproval implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RefundRequestsService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly request = signal<ReturnRequest | null>(null);

  protected readonly approveForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });
  protected readonly rejectForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(1)]],
  });

  protected readonly submittingAction = signal<'approve' | 'reject' | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly escalationRequired = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const returnRequestId = this.route.snapshot.paramMap.get('returnRequestId');
    if (!returnRequestId) {
      this.loadError.set('No refund request specified.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(returnRequestId).subscribe({
      next: (request) => {
        this.loading.set(false);
        this.request.set(request);
        this.approveForm.patchValue({ amount: request.requestedAmount.amount });
        this.approveForm.controls.amount.addValidators(Validators.max(request.requestedAmount.amount));
        this.approveForm.controls.amount.updateValueAndValidity();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(extractErrorMessage(error, "Couldn't load this refund request."));
      },
    });
  }

  approve(): void {
    const request = this.request();
    if (!request || this.approveForm.invalid || this.submittingAction()) {
      this.approveForm.markAllAsTouched();
      return;
    }

    this.submitAction('approve', () =>
      this.service.approve(
        request.returnRequestId,
        { amount: this.approveForm.getRawValue().amount, currency: request.requestedAmount.currency },
        request.version,
      ),
    );
  }

  reject(): void {
    const request = this.request();
    if (!request || this.rejectForm.invalid || this.submittingAction()) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.submitAction('reject', () => this.service.reject(request.returnRequestId, this.rejectForm.getRawValue().reason, request.version));
  }

  private submitAction(action: 'approve' | 'reject', request$: () => ReturnType<RefundRequestsService['approve']>): void {
    this.submittingAction.set(action);
    this.actionError.set(null);
    this.escalationRequired.set(false);

    request$().subscribe({
      next: () => {
        this.submittingAction.set(null);
        this.router.navigateByUrl('/support-console/refund-requests');
      },
      error: (error: unknown) => {
        this.submittingAction.set(null);
        const code = extractErrorCode(error);
        if (code === 'escalation_required') {
          this.escalationRequired.set(true);
          this.actionError.set(
            extractErrorMessage(error, 'This amount exceeds your refund cap and requires Admin escalation.'),
          );
        } else {
          this.actionError.set(
            extractErrorMessage(error, 'This request may already have been resolved by another principal — reloading.'),
          );
          this.load();
        }
      },
    });
  }
}
