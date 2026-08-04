import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CouponManagementService } from '../data/coupon-management.service';
import { CouponForm } from './coupon-form';

describe('CouponForm', () => {
  let couponManagementService: jasmine.SpyObj<CouponManagementService>;

  beforeEach(() => {
    couponManagementService = jasmine.createSpyObj('CouponManagementService', ['createCoupon']);
    TestBed.configureTestingModule({
      imports: [CouponForm],
      providers: [{ provide: CouponManagementService, useValue: couponManagementService }],
    });
  });

  it('does not submit an invalid form', () => {
    const fixture = TestBed.createComponent(CouponForm);
    fixture.componentInstance.open();
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(couponManagementService.createCoupon).not.toHaveBeenCalled();
  });

  it('creates a coupon, uppercasing the code', () => {
    couponManagementService.createCoupon.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CouponForm);
    fixture.componentInstance.open();
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({
      couponCode: 'save10',
      discountAmount: 10,
      discountCurrency: 'USD',
      perUserCap: null,
      globalCap: null,
      validFrom: '2026-01-01T00:00',
      validUntil: '2026-02-01T00:00',
    });
    let saved = false;
    fixture.componentInstance.saved.subscribe(() => (saved = true));
    fixture.componentInstance.submit();

    expect(couponManagementService.createCoupon).toHaveBeenCalledWith(
      jasmine.objectContaining({ couponCode: 'SAVE10', discountAmount: 10, discountCurrency: 'USD' }),
    );
    expect(saved).toBeTrue();
  });

  it('surfaces an error message on failure', () => {
    couponManagementService.createCoupon.and.returnValue(throwError(() => ({ error: { message: 'Code already exists.' } })));
    const fixture = TestBed.createComponent(CouponForm);
    fixture.componentInstance.open();
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({
      couponCode: 'SAVE10',
      discountAmount: 10,
      discountCurrency: 'USD',
      perUserCap: null,
      globalCap: null,
      validFrom: '2026-01-01T00:00',
      validUntil: '2026-02-01T00:00',
    });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Code already exists.');
  });
});
