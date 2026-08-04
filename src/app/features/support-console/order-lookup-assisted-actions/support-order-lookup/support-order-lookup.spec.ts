import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SupportOrderLookupService } from '../data/support-order-lookup.service';
import { SupportOrderLookup } from './support-order-lookup';

describe('SupportOrderLookup', () => {
  let service: jasmine.SpyObj<SupportOrderLookupService>;

  const order = {
    orderId: 'order-1',
    userId: 'user-1',
    status: 'Delivered' as const,
    items: [],
    totalAmount: { amount: 20, currency: 'USD' },
    createdAt: '2026-01-01T00:00:00Z',
  };

  const paymentIntent = {
    paymentIntentId: 'pi-1',
    orderId: 'order-1',
    status: 'completed' as const,
    capturedAmount: { amount: 20, currency: 'USD' },
    totalRefunded: 0,
    disputed: false,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('SupportOrderLookupService', ['getOrder', 'getPaymentIntent', 'initiateRefund']);
    TestBed.configureTestingModule({
      imports: [SupportOrderLookup],
      providers: [{ provide: SupportOrderLookupService, useValue: service }],
    });
  });

  it('looks up and displays an order', () => {
    service.getOrder.and.returnValue(of(order));
    const fixture = TestBed.createComponent(SupportOrderLookup);
    fixture.detectChanges();
    fixture.componentInstance['orderIdInput'] = 'order-1';
    fixture.componentInstance.lookupOrder();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Delivered');
  });

  it('shows an error when the order is not found', () => {
    service.getOrder.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));
    const fixture = TestBed.createComponent(SupportOrderLookup);
    fixture.detectChanges();
    fixture.componentInstance['orderIdInput'] = 'missing';
    fixture.componentInstance.lookupOrder();
    fixture.detectChanges();
    expect(fixture.componentInstance['orderError']()).toBe('Not found');
  });

  it('looks up a payment intent and prefills the remaining refundable amount', () => {
    service.getPaymentIntent.and.returnValue(of(paymentIntent));
    const fixture = TestBed.createComponent(SupportOrderLookup);
    fixture.detectChanges();
    fixture.componentInstance['refundForm'].patchValue({ paymentIntentId: 'pi-1' });
    fixture.componentInstance.lookupPaymentIntent();
    fixture.detectChanges();

    expect(fixture.componentInstance['paymentIntent']()).toEqual(paymentIntent);
    expect(fixture.componentInstance['refundForm'].value.amount).toBe(20);
  });

  it('initiates a refund and re-fetches the payment intent', () => {
    service.getPaymentIntent.and.returnValue(of(paymentIntent));
    service.initiateRefund.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(SupportOrderLookup);
    fixture.detectChanges();
    fixture.componentInstance['refundForm'].patchValue({ paymentIntentId: 'pi-1' });
    fixture.componentInstance.lookupPaymentIntent();
    fixture.componentInstance['refundForm'].patchValue({ amount: 15 });

    fixture.componentInstance.submitRefund();

    expect(service.initiateRefund).toHaveBeenCalledWith('pi-1', { amount: 15, currency: 'USD' });
    expect(service.getPaymentIntent).toHaveBeenCalledTimes(2);
  });

  it('surfaces an escalation-required style error from the backend', () => {
    service.getPaymentIntent.and.returnValue(of(paymentIntent));
    service.initiateRefund.and.returnValue(
      throwError(() => ({ error: { code: 'escalation_required', message: 'Exceeds your refund cap — Admin escalation required.' } })),
    );
    const fixture = TestBed.createComponent(SupportOrderLookup);
    fixture.detectChanges();
    fixture.componentInstance['refundForm'].patchValue({ paymentIntentId: 'pi-1' });
    fixture.componentInstance.lookupPaymentIntent();
    fixture.componentInstance.submitRefund();
    fixture.detectChanges();

    expect(fixture.componentInstance['refundError']()).toContain('Admin escalation required');
  });
});
