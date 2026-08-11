import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { OrderApiService } from '../../../../core/http/generated/order/v1';
import { OrderLookupService } from './order-lookup.service';

describe('OrderLookupService', () => {
  let service: OrderLookupService;
  let orderApi: jasmine.SpyObj<OrderApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    orderApi = jasmine.createSpyObj<OrderApiService>('OrderApiService', ['getOrder', 'resolveFulfillmentException']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['resolveOrderFulfillmentException']);
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderApiService, useValue: orderApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(OrderLookupService);
  });

  it('getOrder() reads from order-service', () => {
    orderApi.getOrder.and.returnValue(of({} as any));
    service.getOrder('order-1').subscribe();
    expect(orderApi.getOrder).toHaveBeenCalledWith('order-1');
  });

  it('resolveFulfillmentException() calls kart-admin-service\'s audited proxy, then re-fetches the order', () => {
    adminApi.resolveOrderFulfillmentException.and.returnValue(of({} as any));
    const refreshedOrder = { orderId: 'order-1', status: 'Paid' } as any;
    orderApi.getOrder.and.returnValue(of(refreshedOrder));

    let result: unknown;
    service.resolveFulfillmentException('order-1', 'retry').subscribe((value) => (result = value));

    expect(adminApi.resolveOrderFulfillmentException).toHaveBeenCalledWith('order-1', 'retry', jasmine.any(String));
    expect(orderApi.getOrder).toHaveBeenCalledWith('order-1');
    expect(result).toBe(refreshedOrder);
  });
});
