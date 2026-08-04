import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ReturnRequestApiService } from '../../../../core/http/generated/order-returns/v1';
import { RefundRequestsService } from './refund-requests.service';

describe('RefundRequestsService', () => {
  let service: RefundRequestsService;
  let returnRequestApi: jasmine.SpyObj<ReturnRequestApiService>;

  beforeEach(() => {
    returnRequestApi = jasmine.createSpyObj<ReturnRequestApiService>('ReturnRequestApiService', [
      'list',
      'get',
      'approve',
      'reject',
    ]);
    TestBed.configureTestingModule({ providers: [{ provide: ReturnRequestApiService, useValue: returnRequestApi }] });
    service = TestBed.inject(RefundRequestsService);
  });

  it('list() defaults to the Requested status', () => {
    returnRequestApi.list.and.returnValue(of({} as any));
    service.list().subscribe();
    expect(returnRequestApi.list).toHaveBeenCalledWith({ status: 'Requested' });
  });

  it('approve() forwards the If-Match version and a generated idempotency key', () => {
    returnRequestApi.approve.and.returnValue(of({} as any));
    service.approve('rr-1', { amount: 10, currency: 'USD' }, 3).subscribe();
    expect(returnRequestApi.approve).toHaveBeenCalledWith('rr-1', { amount: { amount: 10, currency: 'USD' } }, 3, jasmine.any(String));
  });

  it('reject() forwards the mandatory reason', () => {
    returnRequestApi.reject.and.returnValue(of({} as any));
    service.reject('rr-1', 'Item not eligible for return', 3).subscribe();
    expect(returnRequestApi.reject).toHaveBeenCalledWith('rr-1', { reason: 'Item not eligible for return' }, 3, jasmine.any(String));
  });
});
