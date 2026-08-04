import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrderLookupService } from '../../order-lookup/data/order-lookup.service';
import { ResolveFulfillmentException } from './resolve-fulfillment-exception';

describe('ResolveFulfillmentException', () => {
  let orderLookupService: jasmine.SpyObj<OrderLookupService>;

  const order = {
    orderId: 'order-1',
    userId: 'user-1',
    status: 'FulfillmentException' as const,
    items: [],
    totalAmount: { amount: 10, currency: 'USD' },
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    orderLookupService = jasmine.createSpyObj('OrderLookupService', ['resolveFulfillmentException']);
    TestBed.configureTestingModule({
      imports: [ResolveFulfillmentException],
      providers: [{ provide: OrderLookupService, useValue: orderLookupService }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ResolveFulfillmentException);
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();
    return fixture;
  }

  it('retries fulfillment and emits the resolved order', () => {
    const resolvedOrder = { ...order, status: 'Paid' as const };
    orderLookupService.resolveFulfillmentException.and.returnValue(of(resolvedOrder));
    const fixture = create();
    let emitted: unknown;
    fixture.componentInstance.resolved.subscribe((o) => (emitted = o));

    fixture.componentInstance.resolve('retry');

    expect(orderLookupService.resolveFulfillmentException).toHaveBeenCalledWith('order-1', 'retry');
    expect(emitted).toEqual(resolvedOrder);
  });

  it('cancels only after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = create();
    fixture.componentInstance.resolve('cancel');
    expect(orderLookupService.resolveFulfillmentException).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', () => {
    orderLookupService.resolveFulfillmentException.and.returnValue(throwError(() => ({ error: { message: 'Not in exception state.' } })));
    const fixture = create();
    fixture.componentInstance.resolve('retry');
    fixture.detectChanges();
    expect(fixture.componentInstance['errorMessage']()).toBe('Not in exception state.');
  });
});
