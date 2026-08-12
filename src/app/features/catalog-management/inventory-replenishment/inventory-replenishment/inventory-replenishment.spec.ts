import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GrantService } from '../../../../core/auth/grant.service';
import { InventoryReplenishmentService } from '../data/inventory-replenishment.service';
import { InventoryReplenishment } from './inventory-replenishment';

describe('InventoryReplenishment', () => {
  let service: jasmine.SpyObj<InventoryReplenishmentService>;

  beforeEach(() => {
    service = jasmine.createSpyObj('InventoryReplenishmentService', [
      'getStockLevel',
      'replenish',
      'provision',
      'updateThreshold',
      'reconcile',
      'getLowStock',
    ]);
    TestBed.configureTestingModule({
      imports: [InventoryReplenishment],
      providers: [
        { provide: InventoryReplenishmentService, useValue: service },
        { provide: GrantService, useValue: { has: () => true } },
      ],
    });
  });

  it('does not look up with an invalid form', () => {
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();
    fixture.componentInstance.lookup();
    expect(service.getStockLevel).not.toHaveBeenCalled();
  });

  it('looks up stock and shows the result', () => {
    service.getStockLevel.and.returnValue(of({ sku: 'SKU-1', availableQty: 42 }));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['lookupForm'].setValue({ sku: 'SKU-1', warehouseId: '' });
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('shows an error when the SKU is not found', () => {
    service.getStockLevel.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['lookupForm'].setValue({ sku: 'SKU-404', warehouseId: '' });
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.componentInstance['lookupError']()).toBe('Not found');
  });

  it('replenishes stock and re-runs the lookup', () => {
    service.getStockLevel.and.returnValue(of({ sku: 'SKU-1', availableQty: 42 }));
    service.replenish.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['lookupForm'].setValue({ sku: 'SKU-1', warehouseId: '' });
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    fixture.componentInstance['replenishForm'].setValue({ warehouseId: 'wh-1', qtyAdded: 10, reason: 'Restock' });
    fixture.componentInstance.replenish();

    expect(service.replenish).toHaveBeenCalledWith('SKU-1', { warehouseId: 'wh-1', qtyAdded: 10, reason: 'Restock' });
    expect(service.getStockLevel).toHaveBeenCalledTimes(2);
  });

  it('provisions a new warehouse/SKU row', () => {
    service.provision.and.returnValue(of(undefined));
    service.getStockLevel.and.returnValue(of({ sku: 'SKU-NEW', warehouseId: 'wh-1', availableQty: 10 }));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['provisionForm'].setValue({
      warehouseId: 'wh-1',
      sku: 'SKU-NEW',
      initialQty: 10,
      replenishmentThreshold: 2,
      targetStockingLevel: 20,
    });
    fixture.componentInstance.provision();

    expect(service.provision).toHaveBeenCalledWith({
      warehouseId: 'wh-1',
      sku: 'SKU-NEW',
      initialQty: 10,
      replenishmentThreshold: 2,
      targetStockingLevel: 20,
    });
    expect(fixture.componentInstance['provisionSuccess']()).toContain('SKU-NEW');
  });

  it('updates the threshold for a warehouse-scoped lookup', () => {
    service.getStockLevel.and.returnValue(of({ sku: 'SKU-1', warehouseId: 'wh-1', availableQty: 42 }));
    service.updateThreshold.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['lookupForm'].setValue({ sku: 'SKU-1', warehouseId: 'wh-1' });
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    fixture.componentInstance['thresholdForm'].setValue({ replenishmentThreshold: 5, targetStockingLevel: 50 });
    fixture.componentInstance.updateThreshold();

    expect(service.updateThreshold).toHaveBeenCalledWith('wh-1', 'SKU-1', { replenishmentThreshold: 5, targetStockingLevel: 50 });
  });

  it('reconciles stock for a warehouse-scoped lookup and reports the variance', () => {
    service.getStockLevel.and.returnValue(of({ sku: 'SKU-1', warehouseId: 'wh-1', availableQty: 40 }));
    service.reconcile.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance['lookupForm'].setValue({ sku: 'SKU-1', warehouseId: 'wh-1' });
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    fixture.componentInstance['reconcileForm'].setValue({ countedQty: 55, reason: 'cycle count' });
    fixture.componentInstance.reconcile();

    expect(service.reconcile).toHaveBeenCalledWith('wh-1', 'SKU-1', { countedQty: 55, reason: 'cycle count' });
    expect(fixture.componentInstance['reconcileSuccess']()).toContain('+15');
  });

  it('loads reorder alerts', () => {
    service.getLowStock.and.returnValue(of([{ sku: 'SKU-1', warehouseId: 'wh-1', availableQty: 1 }]));
    const fixture = TestBed.createComponent(InventoryReplenishment);
    fixture.detectChanges();

    fixture.componentInstance.loadLowStock();
    fixture.detectChanges();

    expect(fixture.componentInstance['lowStock']()).toEqual([{ sku: 'SKU-1', warehouseId: 'wh-1', availableQty: 1 }]);
  });
});
