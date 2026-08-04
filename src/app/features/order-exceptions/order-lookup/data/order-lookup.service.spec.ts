import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrderApiService } from '../../../../core/http/generated/order/v1';
import { OrderLookupService } from './order-lookup.service';

describe('OrderLookupService', () => {
  let service: OrderLookupService;
  let orderApi: jasmine.SpyObj<OrderApiService>;

  beforeEach(() => {
    orderApi = jasmine.createSpyObj<OrderApiService>('OrderApiService', ['getOrder', 'resolveFulfillmentException']);
    TestBed.configureTestingModule({ providers: [{ provide: OrderApiService, useValue: orderApi }] });
    service = TestBed.inject(OrderLookupService);
  });

  it('getOrder() reads from order-service', () => {
    orderApi.getOrder.and.returnValue(of({} as any));
    service.getOrder('order-1').subscribe();
    expect(orderApi.getOrder).toHaveBeenCalledWith('order-1');
  });

  it('resolveFulfillmentException() calls the admin-only resolution endpoint', () => {
    orderApi.resolveFulfillmentException.and.returnValue(of({} as any));
    service.resolveFulfillmentException('order-1', 'retry').subscribe();
    expect(orderApi.resolveFulfillmentException).toHaveBeenCalledWith('order-1', { action: 'retry' }, jasmine.any(String));
  });
});
