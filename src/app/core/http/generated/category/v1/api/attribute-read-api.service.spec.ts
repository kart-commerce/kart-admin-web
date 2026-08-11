import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AttributeReadApiService } from './attribute-read-api.service';

describe('AttributeReadApiService', () => {
  let service: AttributeReadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AttributeReadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listAttributes() GETs /attributes with an optional categoryId', () => {
    service.listAttributes({ categoryId: 'cat-1' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/attributes');
    expect(req.request.params.get('categoryId')).toBe('cat-1');
    req.flush([]);
  });

  it('listAttributes() omits categoryId entirely when listing all attributes', () => {
    service.listAttributes().subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/attributes');
    expect(req.request.params.has('categoryId')).toBeFalse();
    req.flush([]);
  });
});
