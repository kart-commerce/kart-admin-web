import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ReturnRequestApiService } from './return-request-api.service';

describe('ReturnRequestApiService', () => {
  let service: ReturnRequestApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReturnRequestApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() GETs /returns with a status filter', () => {
    service.list({ status: 'Requested' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/v1/returns');
    expect(req.request.params.get('status')).toBe('Requested');
    req.flush({ items: [], page: 1, pageSize: 50, total: 0 });
  });

  it('get() GETs /returns/{id}', () => {
    service.get('rr-1').subscribe();
    httpMock.expectOne('/v1/returns/rr-1').flush({});
  });

  it('approve() POSTs the amount with Idempotency-Key and If-Match', () => {
    service.approve('rr-1', { amount: { amount: 10, currency: 'USD' } }, 3, 'idem-1').subscribe();
    const req = httpMock.expectOne('/v1/returns/rr-1/approve');
    expect(req.request.headers.get('If-Match')).toBe('3');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-1');
    expect(req.request.body).toEqual({ amount: { amount: 10, currency: 'USD' } });
    req.flush({});
  });

  it('reject() POSTs the mandatory reason with Idempotency-Key and If-Match', () => {
    service.reject('rr-1', { reason: 'Outside window' }, 3, 'idem-1').subscribe();
    const req = httpMock.expectOne('/v1/returns/rr-1/reject');
    expect(req.request.headers.get('If-Match')).toBe('3');
    expect(req.request.body).toEqual({ reason: 'Outside window' });
    req.flush({});
  });
});
