import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrderLookupService } from '../data/order-lookup.service';
import { OrderDetail } from './order-detail';

describe('OrderDetail', () => {
  let orderLookupService: jasmine.SpyObj<OrderLookupService>;

  const order = {
    orderId: 'order-1',
    userId: 'user-1',
    status: 'Paid' as const,
    items: [{ sku: 'SKU-1', qty: 2, unitPrice: { amount: 5, currency: 'USD' } }],
    totalAmount: { amount: 10, currency: 'USD' },
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    orderLookupService = jasmine.createSpyObj('OrderLookupService', ['getOrder', 'resolveFulfillmentException']);
    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [{ provide: OrderLookupService, useValue: orderLookupService }],
    });
  });

  it('does nothing on an empty order ID', () => {
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();
    fixture.componentInstance.lookup();
    expect(orderLookupService.getOrder).not.toHaveBeenCalled();
  });

  it('looks up and renders an order', () => {
    orderLookupService.getOrder.and.returnValue(of(order));
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();

    fixture.componentInstance['orderIdInput'] = 'order-1';
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('order-1');
    expect(fixture.nativeElement.textContent).toContain('SKU-1');
  });

  it('shows an error when the order is not found', () => {
    orderLookupService.getOrder.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();

    fixture.componentInstance['orderIdInput'] = 'missing';
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Not found');
  });

  it('shows the fulfillment-exception resolver only when the order is in that state', () => {
    orderLookupService.getOrder.and.returnValue(of({ ...order, status: 'FulfillmentException' as const }));
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();
    fixture.componentInstance['orderIdInput'] = 'order-1';
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('kart-resolve-fulfillment-exception')).toBeTruthy();
  });
});
