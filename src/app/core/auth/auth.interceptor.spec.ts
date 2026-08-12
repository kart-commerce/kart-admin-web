import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('retries once after a silent refresh on a single 401', () => {
    let result: unknown;
    http.get('/v1/admin/actions').subscribe((res) => (result = res));

    httpMock.expectOne('/v1/admin/actions').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/bff/auth/refresh').flush({});
    httpMock.expectOne('/v1/admin/actions').flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('does not attempt refresh for auth routes themselves', () => {
    let errored = false;
    http.post('/api/bff/auth/native/login', {}).subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/api/bff/auth/native/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBeTrue();
    httpMock.expectNone('/api/bff/auth/refresh');
  });

  it('propagates the original error if refresh itself fails', () => {
    let errored = false;
    http.get('/v1/admin/actions').subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/v1/admin/actions').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/bff/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBeTrue();
  });

  it('coalesces two requests that 401 around the same time into a single refresh call', () => {
    let resultA: unknown;
    let resultB: unknown;
    http.get('/v1/admin/actions').subscribe((res) => (resultA = res));
    http.get('/v1/admin/widgets').subscribe((res) => (resultB = res));

    httpMock.expectOne('/v1/admin/actions').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/v1/admin/widgets').flush(null, { status: 401, statusText: 'Unauthorized' });

    // Only one refresh call should go out even though both requests 401'd.
    httpMock.expectOne('/api/bff/auth/refresh').flush({});

    httpMock.expectOne('/v1/admin/actions').flush({ ok: 'actions' });
    httpMock.expectOne('/v1/admin/widgets').flush({ ok: 'widgets' });

    expect(resultA).toEqual({ ok: 'actions' });
    expect(resultB).toEqual({ ok: 'widgets' });
  });
});
