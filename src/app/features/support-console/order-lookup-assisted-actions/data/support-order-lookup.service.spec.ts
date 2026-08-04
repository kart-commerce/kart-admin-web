import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrderApiService } from '../../../../core/http/generated/order/v1';
import { PaymentApiService } from '../../../../core/http/generated/payment/v1';
import { SupportOrderLookupService } from './support-order-lookup.service';

describe('SupportOrderLookupService', () => {
  let service: SupportOrderLookupService;
  let orderApi: jasmine.SpyObj<OrderApiService>;
  let paymentApi: jasmine.SpyObj<PaymentApiService>;

  beforeEach(() => {
    orderApi = jasmine.createSpyObj<OrderApiService>('OrderApiService', ['getOrder']);
    paymentApi = jasmine.createSpyObj<PaymentApiService>('PaymentApiService', ['getPaymentIntent', 'refundPayment']);
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderApiService, useValue: orderApi },
        { provide: PaymentApiService, useValue: paymentApi },
      ],
    });
    service = TestBed.inject(SupportOrderLookupService);
  });

  it('getOrder() reads from order-service', () => {
    orderApi.getOrder.and.returnValue(of({} as any));
    service.getOrder('order-1').subscribe();
    expect(orderApi.getOrder).toHaveBeenCalledWith('order-1');
  });

  it('initiateRefund() calls payment-service with a generated idempotency key', () => {
    paymentApi.refundPayment.and.returnValue(of({} as any));
    service.initiateRefund('pi-1', { amount: 10, currency: 'USD' }).subscribe();
    expect(paymentApi.refundPayment).toHaveBeenCalledWith('pi-1', { amount: { amount: 10, currency: 'USD' } }, jasmine.any(String));
  });
});
