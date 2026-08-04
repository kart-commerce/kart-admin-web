import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService, CouponAdminView, Page } from '../../../../core/http/generated/admin/v1';

export interface CouponFormValue {
  couponCode: string;
  discountAmount: number;
  discountCurrency: string;
  perUserCap?: number | null;
  globalCap?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

/**
 * CAT-3's data layer — every call goes through kart-admin-service's
 * `/admin/coupons/*` proxy (CAT-3's design source), including `list()`,
 * an assumed extension (see `CouponAdminView`'s doc comment).
 */
@Injectable({ providedIn: 'root' })
export class CouponManagementService {
  private readonly adminApi = inject(AdminApiService);

  list(params: { page?: number; pageSize?: number } = {}): Observable<Page<CouponAdminView>> {
    return this.adminApi.listCoupons(params);
  }

  createCoupon(value: CouponFormValue): Observable<void> {
    return this.adminApi
      .createCoupon(
        {
          couponCode: value.couponCode,
          discountValue: { amount: value.discountAmount, currency: value.discountCurrency },
          perUserCap: value.perUserCap ?? null,
          globalCap: value.globalCap ?? null,
          validFrom: value.validFrom ?? null,
          validUntil: value.validUntil ?? null,
        },
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  deactivateCoupon(couponCode: string): Observable<void> {
    return this.adminApi.deactivateCoupon(couponCode, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
