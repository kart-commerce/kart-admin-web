import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrderManagementService } from '../data/order-management.service';
import { OrderDetail } from './order-detail';

describe('OrderDetail', () => {
  let service: jasmine.SpyObj<OrderManagementService>;

  const order = {
    orderId: 'order-1',
    userId: 'user-1',
    status: 'Paid' as const,
    items: [{ sku: 'SKU-1', qty: 2, unitPrice: { amount: 10, currency: 'USD' } }],
    totalAmount: { amount: 20, currency: 'USD' },
    createdAt: '2026-08-11T00:00:00Z',
    shippingAddress: null,
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('OrderManagementService', [
      'getOrder',
      'cancelOrder',
      'updateStatus',
      'updateShippingAddress',
      'requestShipment',
      'getInvoice',
      'getWarehouseAllocations',
    ]);
    service.getOrder.and.returnValue(of(order));
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrderManagementService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ orderId: 'order-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();
    return fixture;
  }

  it('loads and renders the order detail', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('order-1');
    expect(fixture.nativeElement.textContent).toContain('SKU-1');
    expect(service.getOrder).toHaveBeenCalledWith('order-1');
  });

  it('shows an error state on failure', () => {
    service.getOrder.and.returnValue(throwError(() => ({ error: { message: 'Order service down' } })));
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Order service down');
  });

  it('cancels the order after confirmation and reloads', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.cancelOrder.and.returnValue(of(undefined));
    const fixture = setup();

    fixture.componentInstance['cancelReason'] = 'customer request';
    fixture.componentInstance.cancel();

    expect(service.cancelOrder).toHaveBeenCalledWith('order-1', 'customer request');
    expect(service.getOrder).toHaveBeenCalledTimes(2);
  });

  it('does not cancel without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = setup();

    fixture.componentInstance.cancel();

    expect(service.cancelOrder).not.toHaveBeenCalled();
  });

  it('updates status with the selected target and reason', () => {
    service.updateStatus.and.returnValue(of(undefined));
    const fixture = setup();

    fixture.componentInstance['statusTarget'] = 'Shipped';
    fixture.componentInstance['statusReason'] = 'courier confirmed out-of-band';
    fixture.componentInstance.updateStatus();

    expect(service.updateStatus).toHaveBeenCalledWith('order-1', 'Shipped', 'courier confirmed out-of-band');
  });

  it('saves the shipping address', () => {
    service.updateShippingAddress.and.returnValue(of(undefined));
    const fixture = setup();

    fixture.componentInstance['addressForm'] = {
      recipientName: 'Jane Doe',
      line1: '1 Test St',
      line2: '',
      city: 'Testville',
      state: 'TS',
      postalCode: '00000',
      country: 'US',
      phone: '',
    };
    fixture.componentInstance.saveAddress();

    expect(service.updateShippingAddress).toHaveBeenCalledWith('order-1', {
      recipientName: 'Jane Doe',
      line1: '1 Test St',
      line2: null,
      city: 'Testville',
      state: 'TS',
      postalCode: '00000',
      country: 'US',
      phone: null,
    });
  });

  it('requests shipment', () => {
    service.requestShipment.and.returnValue(of(undefined));
    const fixture = setup();

    fixture.componentInstance.requestShipment();

    expect(service.requestShipment).toHaveBeenCalledWith('order-1');
  });

  it('views the invoice', () => {
    const invoice = {
      invoiceNumber: 'INV-1',
      orderId: 'order-1',
      userId: 'user-1',
      status: 'Paid' as const,
      items: order.items,
      subtotal: order.totalAmount,
      total: order.totalAmount,
      shippingAddress: null,
      orderCreatedAt: order.createdAt,
      issuedAt: '2026-08-11T01:00:00Z',
    };
    service.getInvoice.and.returnValue(of(invoice));
    const fixture = setup();

    fixture.componentInstance.viewInvoice();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('INV-1');
  });

  it('views warehouse allocations', () => {
    service.getWarehouseAllocations.and.returnValue(
      of([
        {
          reservationId: 'res-1',
          orderId: 'order-1',
          sku: 'SKU-1',
          qty: 2,
          status: 'reserved' as const,
          allocations: [{ warehouseId: 'WH-1', qty: 2 }],
          expiresAt: '2026-08-11T00:15:00Z',
        },
      ]),
    );
    const fixture = setup();

    fixture.componentInstance.viewWarehouseAllocations();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('WH-1');
  });
});
