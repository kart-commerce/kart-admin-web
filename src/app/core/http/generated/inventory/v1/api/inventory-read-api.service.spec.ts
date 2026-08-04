import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { InventoryReadApiService } from './inventory-read-api.service';

describe('InventoryReadApiService', () => {
  let service: InventoryReadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InventoryReadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getStockLevel() GETs /inventory/{sku} with an optional warehouseId', () => {
    service.getStockLevel('SKU-1', 'wh-1').subscribe();
    const req = httpMock.expectOne((r) => r.url === '/v1/inventory/SKU-1');
    expect(req.request.params.get('warehouseId')).toBe('wh-1');
    req.flush({ sku: 'SKU-1', availableQty: 0 });
  });

  it('getStockLevel() omits warehouseId when not given', () => {
    service.getStockLevel('SKU-1').subscribe();
    const req = httpMock.expectOne((r) => r.url === '/v1/inventory/SKU-1');
    expect(req.request.params.has('warehouseId')).toBeFalse();
    req.flush({ sku: 'SKU-1', availableQty: 0 });
  });
});
