import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { PaymentApiService } from './payment-api.service';

describe('PaymentApiService', () => {
  let service: PaymentApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaymentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getPaymentIntent() GETs /payments/{id}', () => {
    service.getPaymentIntent('pi-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/payments/pi-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('refundPayment() POSTs the amount with an Idempotency-Key', () => {
    service.refundPayment('pi-1', { amount: { amount: 10, currency: 'USD' } }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/payments/pi-1/refund');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: { amount: 10, currency: 'USD' } });
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-1');
    req.flush({});
  });
});
