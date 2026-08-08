import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { SearchApiService } from './search-api.service';

describe('SearchApiService', () => {
  let service: SearchApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SearchApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() GETs /search with defaults for page/size', () => {
    service.search({ q: 'phone' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/search');
    expect(req.request.params.get('q')).toBe('phone');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ results: [], facets: {}, pagination: { page: 1, size: 20, totalHits: 0, totalHitsIsApproximate: false }, truncated: false });
  });

  it('search() appends multiple category values and price/rating filters', () => {
    service.search({ category: ['electronics', 'fashion'], priceMin: 10, priceMax: 100, ratingMin: 4 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/search');
    expect(req.request.params.getAll('category')).toEqual(['electronics', 'fashion']);
    expect(req.request.params.get('priceMin')).toBe('10');
    expect(req.request.params.get('priceMax')).toBe('100');
    expect(req.request.params.get('ratingMin')).toBe('4');
    req.flush({ results: [], facets: {}, pagination: { page: 1, size: 20, totalHits: 0, totalHitsIsApproximate: false }, truncated: false });
  });
});
