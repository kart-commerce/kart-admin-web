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
    inventoryReadApi = jasmine.createSpyObj<InventoryReadApiService>('InventoryReadApiService', ['getStockLevel', 'getLowStock']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'replenishInventory',
      'provisionWarehouseStock',
      'updateReplenishmentThreshold',
      'reconcileStock',
    ]);
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

  it('getLowStock() reads from inventory-service directly', () => {
    inventoryReadApi.getLowStock.and.returnValue(of([]));
    service.getLowStock('wh-1').subscribe();
    expect(inventoryReadApi.getLowStock).toHaveBeenCalledWith('wh-1');
  });

  it('provision() calls the admin proxy', () => {
    adminApi.provisionWarehouseStock.and.returnValue(of({} as any));
    const value = { warehouseId: 'wh-1', sku: 'SKU-NEW', initialQty: 10, replenishmentThreshold: 2, targetStockingLevel: 20 };
    service.provision(value).subscribe();
    expect(adminApi.provisionWarehouseStock).toHaveBeenCalledWith(value, jasmine.any(String));
  });

  it('updateThreshold() calls the admin proxy', () => {
    adminApi.updateReplenishmentThreshold.and.returnValue(of({} as any));
    const value = { replenishmentThreshold: 5, targetStockingLevel: 50 };
    service.updateThreshold('wh-1', 'SKU-1', value).subscribe();
    expect(adminApi.updateReplenishmentThreshold).toHaveBeenCalledWith('wh-1', 'SKU-1', value, jasmine.any(String));
  });

  it('reconcile() calls the admin proxy', () => {
    adminApi.reconcileStock.and.returnValue(of({} as any));
    const value = { countedQty: 30, reason: 'cycle count' };
    service.reconcile('wh-1', 'SKU-1', value).subscribe();
    expect(adminApi.reconcileStock).toHaveBeenCalledWith('wh-1', 'SKU-1', value, jasmine.any(String));
  });
});
