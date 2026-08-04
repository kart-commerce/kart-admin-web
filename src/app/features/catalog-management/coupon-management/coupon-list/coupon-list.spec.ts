import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CouponManagementService } from '../data/coupon-management.service';
import { CouponList } from './coupon-list';

describe('CouponList', () => {
  let couponManagementService: jasmine.SpyObj<CouponManagementService>;

  const page = {
    items: [
      {
        couponCode: 'SAVE10',
        perUserCap: 1,
        globalCap: null,
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2099-01-01T00:00:00Z',
        totalRedemptions: 3,
        version: 1,
      },
    ],
    page: 1,
    pageSize: 50,
    total: 1,
  };

  beforeEach(() => {
    couponManagementService = jasmine.createSpyObj('CouponManagementService', ['list', 'createCoupon', 'deactivateCoupon']);
    couponManagementService.list.and.returnValue(of(page));
    TestBed.configureTestingModule({
      imports: [CouponList],
      providers: [{ provide: CouponManagementService, useValue: couponManagementService }],
    });
  });

  it('loads and renders coupons', () => {
    const fixture = TestBed.createComponent(CouponList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SAVE10');
  });

  it('shows an empty state with no coupons', () => {
    couponManagementService.list.and.returnValue(of({ ...page, items: [] }));
    const fixture = TestBed.createComponent(CouponList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No coupons yet');
  });

  it('shows an error state on failure', () => {
    couponManagementService.list.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(CouponList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('deactivates a coupon after confirmation and reloads', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    couponManagementService.deactivateCoupon.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CouponList);
    fixture.detectChanges();

    fixture.componentInstance.deactivate(page.items[0]);

    expect(couponManagementService.deactivateCoupon).toHaveBeenCalledWith('SAVE10');
    expect(couponManagementService.list).toHaveBeenCalledTimes(2);
  });

  it('treats an already-expired coupon as non-deactivatable', () => {
    const fixture = TestBed.createComponent(CouponList);
    fixture.detectChanges();
    expect(fixture.componentInstance.isExpired({ ...page.items[0], validUntil: '2000-01-01T00:00:00Z' })).toBeTrue();
  });
});
