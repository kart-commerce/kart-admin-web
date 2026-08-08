import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { OrderApiService } from './order-api.service';

describe('OrderApiService', () => {
  let service: OrderApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrderApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getOrder() GETs /orders/{id}', () => {
    service.getOrder('order-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/orders/order-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('resolveFulfillmentException() POSTs the action with an Idempotency-Key', () => {
    service.resolveFulfillmentException('order-1', { action: 'retry' }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/orders/order-1/resolve-fulfillment-exception');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'retry' });
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-1');
    req.flush({});
  });
});
