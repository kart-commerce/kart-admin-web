import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { CouponManagementService } from './coupon-management.service';

describe('CouponManagementService', () => {
  let service: CouponManagementService;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listCoupons', 'createCoupon', 'deactivateCoupon']);
    TestBed.configureTestingModule({ providers: [{ provide: AdminApiService, useValue: adminApi }] });
    service = TestBed.inject(CouponManagementService);
  });

  it('list() delegates to the admin proxy', () => {
    adminApi.listCoupons.and.returnValue(of({} as any));
    service.list({ page: 1 }).subscribe();
    expect(adminApi.listCoupons).toHaveBeenCalledWith({ page: 1 });
  });

  it('createCoupon() maps the form value to CouponWriteRequest', () => {
    adminApi.createCoupon.and.returnValue(of({} as any));
    service
      .createCoupon({ couponCode: 'SAVE10', discountAmount: 10, discountCurrency: 'USD', perUserCap: 1 })
      .subscribe();
    expect(adminApi.createCoupon).toHaveBeenCalledWith(
      {
        couponCode: 'SAVE10',
        discountValue: { amount: 10, currency: 'USD' },
        perUserCap: 1,
        globalCap: null,
        validFrom: null,
        validUntil: null,
      },
      jasmine.any(String),
    );
  });

  it('deactivateCoupon() calls the admin proxy', () => {
    adminApi.deactivateCoupon.and.returnValue(of({} as any));
    service.deactivateCoupon('SAVE10').subscribe();
    expect(adminApi.deactivateCoupon).toHaveBeenCalledWith('SAVE10', jasmine.any(String));
  });
});
