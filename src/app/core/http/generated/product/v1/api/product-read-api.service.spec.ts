import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ProductReadApiService } from './product-read-api.service';

describe('ProductReadApiService', () => {
  let service: ProductReadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductReadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getProduct() GETs /products/{sku}', () => {
    service.getProduct('SKU-1').subscribe();
    const req = httpMock.expectOne('/v1/products/SKU-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
