import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IdleSessionService } from './idle-session.service';
import { mutatingRequestInterceptor } from './mutating-request.interceptor';

describe('mutatingRequestInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let idleSession: jasmine.SpyObj<Pick<IdleSessionService, 'beginMutatingRequest' | 'endMutatingRequest'>>;

  beforeEach(() => {
    idleSession = jasmine.createSpyObj('IdleSessionService', ['beginMutatingRequest', 'endMutatingRequest']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mutatingRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: IdleSessionService, useValue: idleSession },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('tracks a POST as a mutating request', () => {
    http.post('/v1/admin/products', {}).subscribe();
    expect(idleSession.beginMutatingRequest).toHaveBeenCalled();
    httpMock.expectOne('/v1/admin/products').flush({});
    expect(idleSession.endMutatingRequest).toHaveBeenCalled();
  });

  it('does not track a GET request', () => {
    http.get('/v1/admin/actions').subscribe();
    httpMock.expectOne('/v1/admin/actions').flush({});
    expect(idleSession.beginMutatingRequest).not.toHaveBeenCalled();
  });

  it('ends tracking even when the request errors', () => {
    http.post('/v1/admin/products', {}).subscribe({ error: () => undefined });
    httpMock.expectOne('/v1/admin/products').flush(null, { status: 500, statusText: 'Server Error' });
    expect(idleSession.endMutatingRequest).toHaveBeenCalled();
  });
});
