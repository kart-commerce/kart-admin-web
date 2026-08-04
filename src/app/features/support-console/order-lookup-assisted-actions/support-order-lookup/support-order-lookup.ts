import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { OrderView } from '../../../../core/http/generated/order/v1';
import { PaymentIntentView } from '../../../../core/http/generated/payment/v1';
import { SupportOrderLookupService } from '../data/support-order-lookup.service';

/**
 * SUP-1: Support Agent order lookup + assisted actions, including direct
 * refund initiation, within the Support Agent's capped RBAC grant
 * (requirement-spec.md §3.3). Read-only order lookup identical in shape to
 * ORD-1, minus the Admin-only fulfillment-exception action; the refund
 * panel is this ticket's own addition.
 */
@Component({
  selector: 'kart-support-order-lookup',
  imports: [ReactiveFormsModule, FormsModule, KartInput, Button, Spinner, Alert, Card, Badge, FormField, DecimalPipe, DatePipe],
  templateUrl: './support-order-lookup.html',
  styleUrl: './support-order-lookup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportOrderLookup {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupportOrderLookupService);

  protected orderIdInput = '';
  protected readonly loadingOrder = signal(false);
  protected readonly orderError = signal<string | null>(null);
  protected readonly order = signal<OrderView | null>(null);

  protected readonly paymentIntentIdInput = '';
  protected readonly loadingPayment = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly paymentIntent = signal<PaymentIntentView | null>(null);

  protected readonly refundForm = this.fb.nonNullable.group({
    paymentIntentId: ['', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });
  protected readonly refunding = signal(false);
  protected readonly refundError = signal<string | null>(null);
  protected readonly refundSuccess = signal<string | null>(null);

  lookupOrder(): void {
    const orderId = this.orderIdInput.trim();
    if (!orderId) {
      return;
    }
    this.loadingOrder.set(true);
    this.orderError.set(null);
    this.order.set(null);
    this.service.getOrder(orderId).subscribe({
      next: (order) => {
        this.loadingOrder.set(false);
        this.order.set(order);
      },
      error: (error: unknown) => {
        this.loadingOrder.set(false);
        this.orderError.set(extractErrorMessage(error, 'No order found with that ID.'));
      },
    });
  }

  lookupPaymentIntent(): void {
    if (this.refundForm.controls.paymentIntentId.invalid) {
      this.refundForm.controls.paymentIntentId.markAsTouched();
      return;
    }
    const paymentIntentId = this.refundForm.getRawValue().paymentIntentId;
    this.loadingPayment.set(true);
    this.paymentError.set(null);
    this.paymentIntent.set(null);
    this.refundSuccess.set(null);
    this.service.getPaymentIntent(paymentIntentId).subscribe({
      next: (paymentIntent) => {
        this.loadingPayment.set(false);
        this.paymentIntent.set(paymentIntent);
        const remaining = paymentIntent.capturedAmount.amount - paymentIntent.totalRefunded;
        this.refundForm.patchValue({ amount: Math.max(remaining, 0) });
      },
      error: (error: unknown) => {
        this.loadingPayment.set(false);
        this.paymentError.set(extractErrorMessage(error, 'No payment intent found with that ID.'));
      },
    });
  }

  submitRefund(): void {
    const paymentIntent = this.paymentIntent();
    if (!paymentIntent || this.refundForm.invalid || this.refunding()) {
      this.refundForm.markAllAsTouched();
      return;
    }

    this.refunding.set(true);
    this.refundError.set(null);
    this.refundSuccess.set(null);
    const value = this.refundForm.getRawValue();

    this.service.initiateRefund(paymentIntent.paymentIntentId, { amount: value.amount, currency: paymentIntent.capturedAmount.currency }).subscribe({
      next: () => {
        this.refunding.set(false);
        this.refundSuccess.set(`Refund of ${value.amount} ${paymentIntent.capturedAmount.currency} initiated.`);
        this.lookupPaymentIntent();
      },
      error: (error: unknown) => {
        this.refunding.set(false);
        // A refund above this Support Agent's own per-order cap surfaces the
        // backend's own escalation-required rejection here — requirement-spec.md
        // §3.3's "an amount above the Support Agent's cap surfaces as
        // Admin-escalation-required rather than a disabled control with no
        // explanation." No client-side cap is enforced ahead of this.
        this.refundError.set(
          extractErrorMessage(error, 'Could not initiate this refund — it may exceed your refund cap and require Admin escalation.'),
        );
      },
    });
  }
}
