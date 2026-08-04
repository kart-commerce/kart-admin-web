import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { CouponAdminView } from '../../../../core/http/generated/admin/v1';
import { CouponForm } from '../coupon-form/coupon-form';
import { CouponManagementService } from '../data/coupon-management.service';

/** CAT-3: Coupon Management — list, create, deactivate a Coupon. */
@Component({
  selector: 'kart-coupon-list',
  imports: [DataTableShell, Button, RequiresGrant, CouponForm, DatePipe],
  templateUrl: './coupon-list.html',
  styleUrl: './coupon-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponList implements OnInit {
  private readonly couponManagementService = inject(CouponManagementService);

  @ViewChild(CouponForm) private readonly couponForm!: CouponForm;

  protected readonly coupons = signal<CouponAdminView[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deactivatingCode = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.couponManagementService.list().subscribe({
      next: (page) => {
        this.loading.set(false);
        this.coupons.set(page.items);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load coupons."));
      },
    });
  }

  create(): void {
    this.couponForm.open();
  }

  isExpired(coupon: CouponAdminView): boolean {
    return new Date(coupon.validUntil).getTime() <= Date.now();
  }

  deactivate(coupon: CouponAdminView): void {
    if (!confirm(`Deactivate coupon ${coupon.couponCode}? This stops future redemptions immediately.`)) {
      return;
    }
    this.deactivatingCode.set(coupon.couponCode);
    this.couponManagementService.deactivateCoupon(coupon.couponCode).subscribe({
      next: () => {
        this.deactivatingCode.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.deactivatingCode.set(null);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't deactivate this coupon."));
      },
    });
  }
}
