import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OrderManagementService } from '../data/order-management.service';
import { OrderList } from './order-list';

describe('OrderList', () => {
  let orderManagementService: jasmine.SpyObj<OrderManagementService>;

  const pagedOrders = {
    items: [
      {
        orderId: 'order-1',
        userId: 'user-1',
        status: 'Paid' as const,
        totalAmount: { amount: 42.5, currency: 'USD' },
        createdAt: '2026-08-11T00:00:00Z',
        updatedAt: '2026-08-11T00:00:00Z',
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
  };

  beforeEach(() => {
    orderManagementService = jasmine.createSpyObj('OrderManagementService', ['listOrders']);
    orderManagementService.listOrders.and.returnValue(of(pagedOrders));
    TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [provideRouter([]), { provide: OrderManagementService, useValue: orderManagementService }],
    });
  });

  it('loads and renders orders', () => {
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('order-1');
    expect(fixture.nativeElement.textContent).toContain('Paid');
  });

  it('shows an empty state with no results', () => {
    orderManagementService.listOrders.and.returnValue(of({ ...pagedOrders, items: [], totalCount: 0 }));
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No orders found');
  });

  it('shows an error state on failure', () => {
    orderManagementService.listOrders.and.returnValue(throwError(() => ({ error: { message: 'Order service down' } })));
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Order service down');
  });

  it('search() resets to page 1 and re-loads with the current filters', () => {
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    fixture.componentInstance.nextPage(); // stays on page 1 since totalCount === pageSize's own single page
    fixture.componentInstance['statusFilter'] = 'Paid';
    fixture.componentInstance['userIdFilter'] = 'user-1';
    fixture.componentInstance.search();

    expect(orderManagementService.listOrders).toHaveBeenCalledWith({
      status: 'Paid',
      userId: 'user-1',
      createdFrom: undefined,
      createdTo: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('nextPage()/previousPage() page through results', () => {
    orderManagementService.listOrders.and.returnValue(of({ ...pagedOrders, totalCount: 50 }));
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    fixture.componentInstance.nextPage();
    expect(fixture.componentInstance['page']()).toBe(2);

    fixture.componentInstance.previousPage();
    expect(fixture.componentInstance['page']()).toBe(1);
  });
});
