import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../core/http/generated/admin/v1';
import { InventoryReadApiService } from '../../../core/http/generated/inventory/v1';
import { OrderApiService } from '../../../core/http/generated/order/v1';
import { OrderManagementService } from './order-management.service';

describe('OrderManagementService', () => {
  let service: OrderManagementService;
  let orderApi: jasmine.SpyObj<OrderApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;
  let inventoryReadApi: jasmine.SpyObj<InventoryReadApiService>;

  beforeEach(() => {
    orderApi = jasmine.createSpyObj<OrderApiService>('OrderApiService', ['listOrders', 'getOrder', 'getInvoice']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'cancelOrder',
      'updateOrderStatus',
      'updateOrderShippingAddress',
      'requestOrderShipment',
    ]);
    inventoryReadApi = jasmine.createSpyObj<InventoryReadApiService>('InventoryReadApiService', ['getOrderAllocations']);
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderApiService, useValue: orderApi },
        { provide: AdminApiService, useValue: adminApi },
        { provide: InventoryReadApiService, useValue: inventoryReadApi },
      ],
    });
    service = TestBed.inject(OrderManagementService);
  });

  it('listOrders() reads from order-service directly', () => {
    orderApi.listOrders.and.returnValue(of({} as any));
    service.listOrders({ status: 'Paid' }).subscribe();
    expect(orderApi.listOrders).toHaveBeenCalledWith({ status: 'Paid' });
  });

  it('getOrder() reads from order-service directly', () => {
    orderApi.getOrder.and.returnValue(of({} as any));
    service.getOrder('order-1').subscribe();
    expect(orderApi.getOrder).toHaveBeenCalledWith('order-1');
  });

  it('getInvoice() reads from order-service directly', () => {
    orderApi.getInvoice.and.returnValue(of({} as any));
    service.getInvoice('order-1').subscribe();
    expect(orderApi.getInvoice).toHaveBeenCalledWith('order-1');
  });

  it('getWarehouseAllocations() reads from inventory-service directly', () => {
    inventoryReadApi.getOrderAllocations.and.returnValue(of([]));
    service.getWarehouseAllocations('order-1').subscribe();
    expect(inventoryReadApi.getOrderAllocations).toHaveBeenCalledWith('order-1');
  });

  it('cancelOrder() proxies through kart-admin-service with a fresh idempotency key', () => {
    adminApi.cancelOrder.and.returnValue(of({} as any));
    service.cancelOrder('order-1', 'customer request').subscribe();
    expect(adminApi.cancelOrder).toHaveBeenCalledWith('order-1', 'customer request', jasmine.any(String));
  });

  it('updateStatus() proxies through kart-admin-service', () => {
    adminApi.updateOrderStatus.and.returnValue(of({} as any));
    service.updateStatus('order-1', 'Shipped', 'courier confirmed out-of-band').subscribe();
    expect(adminApi.updateOrderStatus).toHaveBeenCalledWith('order-1', 'Shipped', 'courier confirmed out-of-band', jasmine.any(String));
  });

  it('updateShippingAddress() proxies through kart-admin-service', () => {
    adminApi.updateOrderShippingAddress.and.returnValue(of({} as any));
    const address = { recipientName: 'Jane', line1: '1 Test St', city: 'X', state: 'Y', postalCode: '0', country: 'US' };
    service.updateShippingAddress('order-1', address).subscribe();
    expect(adminApi.updateOrderShippingAddress).toHaveBeenCalledWith('order-1', address, jasmine.any(String));
  });

  it('requestShipment() proxies through kart-admin-service', () => {
    adminApi.requestOrderShipment.and.returnValue(of({} as any));
    service.requestShipment('order-1').subscribe();
    expect(adminApi.requestOrderShipment).toHaveBeenCalledWith('order-1', jasmine.any(String));
  });
});
