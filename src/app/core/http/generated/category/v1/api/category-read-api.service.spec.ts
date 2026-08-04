import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { CategoryReadApiService } from './category-read-api.service';

describe('CategoryReadApiService', () => {
  let service: CategoryReadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CategoryReadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listCategories() GETs /categories with an optional parentId', () => {
    service.listCategories({ parentId: 'electronics' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/v1/categories');
    expect(req.request.params.get('parentId')).toBe('electronics');
    req.flush([]);
  });

  it('listCategories() omits parentId entirely when listing top-level categories', () => {
    service.listCategories().subscribe();
    const req = httpMock.expectOne((r) => r.url === '/v1/categories');
    expect(req.request.params.has('parentId')).toBeFalse();
    req.flush([]);
  });
});
