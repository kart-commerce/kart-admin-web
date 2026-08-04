import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { CouponManagementService } from '../data/coupon-management.service';

/** CAT-3's create modal — coupons are created or deactivated, never edited in place (requirement-spec.md §3.1). */
@Component({
  selector: 'kart-coupon-form',
  imports: [ReactiveFormsModule, Modal, FormField, KartInput, Button, Alert],
  templateUrl: './coupon-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponForm {
  private readonly fb = inject(FormBuilder);
  private readonly couponManagementService = inject(CouponManagementService);

  protected readonly isOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly saved = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    couponCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{3,40}$/)]],
    discountAmount: [0, [Validators.required, Validators.min(0.01)]],
    discountCurrency: ['USD', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    perUserCap: [null as number | null],
    globalCap: [null as number | null],
    validFrom: ['', [Validators.required]],
    validUntil: ['', [Validators.required]],
  });

  open(): void {
    this.isOpen.set(true);
    this.errorMessage.set(null);
    this.form.reset({ discountCurrency: 'USD', discountAmount: 0, perUserCap: null, globalCap: null, couponCode: '', validFrom: '', validUntil: '' });
  }

  close(): void {
    this.isOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.couponManagementService
      .createCoupon({
        couponCode: value.couponCode.toUpperCase(),
        discountAmount: value.discountAmount,
        discountCurrency: value.discountCurrency,
        perUserCap: value.perUserCap,
        globalCap: value.globalCap,
        validFrom: new Date(value.validFrom).toISOString(),
        validUntil: new Date(value.validUntil).toISOString(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.close();
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(extractErrorMessage(error, 'Could not create this coupon. Try again.'));
        },
      });
  }
}
