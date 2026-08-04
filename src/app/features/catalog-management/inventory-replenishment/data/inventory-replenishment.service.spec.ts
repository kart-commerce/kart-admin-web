import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { InventoryReadApiService } from '../../../../core/http/generated/inventory/v1';
import { InventoryReplenishmentService } from './inventory-replenishment.service';

describe('InventoryReplenishmentService', () => {
  let service: InventoryReplenishmentService;
  let inventoryReadApi: jasmine.SpyObj<InventoryReadApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    inventoryReadApi = jasmine.createSpyObj<InventoryReadApiService>('InventoryReadApiService', ['getStockLevel']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['replenishInventory']);
    TestBed.configureTestingModule({
      providers: [
        { provide: InventoryReadApiService, useValue: inventoryReadApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(InventoryReplenishmentService);
  });

  it('getStockLevel() reads from inventory-service directly', () => {
    inventoryReadApi.getStockLevel.and.returnValue(of({} as any));
    service.getStockLevel('SKU-1', 'wh-1').subscribe();
    expect(inventoryReadApi.getStockLevel).toHaveBeenCalledWith('SKU-1', 'wh-1');
  });

  it('replenish() calls the admin proxy', () => {
    adminApi.replenishInventory.and.returnValue(of({} as any));
    service.replenish('SKU-1', { warehouseId: 'wh-1', qtyAdded: 50, reason: 'Stocktake' }).subscribe();
    expect(adminApi.replenishInventory).toHaveBeenCalledWith(
      'SKU-1',
      { warehouseId: 'wh-1', qtyAdded: 50, reason: 'Stocktake' },
      jasmine.any(String),
    );
  });
});
