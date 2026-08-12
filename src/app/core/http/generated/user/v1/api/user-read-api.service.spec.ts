import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { UserReadApiService } from './user-read-api.service';

describe('UserReadApiService', () => {
  let service: UserReadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserReadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUserProfile() GETs /users/{userId}', () => {
    service.getUserProfile('user-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/users/user-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
