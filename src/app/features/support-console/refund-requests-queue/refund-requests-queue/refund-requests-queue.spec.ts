import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RefundRequestsService } from '../data/refund-requests.service';
import { RefundRequestsQueue } from './refund-requests-queue';

describe('RefundRequestsQueue', () => {
  let service: jasmine.SpyObj<RefundRequestsService>;

  const page = {
    items: [
      {
        returnRequestId: 'rr-1',
        orderId: 'order-1',
        customerId: 'user-1',
        requestedAmount: { amount: 50, currency: 'USD' },
        lineItems: [],
        status: 'Requested' as const,
        reason: 'Wrong size',
        requestedAt: '2026-01-01T00:00:00Z',
        version: 1,
      },
    ],
    page: 1,
    pageSize: 50,
    total: 1,
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('RefundRequestsService', ['list']);
    service.list.and.returnValue(of(page));
    TestBed.configureTestingModule({
      imports: [RefundRequestsQueue],
      providers: [provideRouter([]), { provide: RefundRequestsService, useValue: service }],
    });
  });

  it('loads and renders queued refund requests', () => {
    const fixture = TestBed.createComponent(RefundRequestsQueue);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Wrong size');
    expect(service.list).toHaveBeenCalledWith('Requested');
  });

  it('shows an empty state with nothing queued', () => {
    service.list.and.returnValue(of({ ...page, items: [] }));
    const fixture = TestBed.createComponent(RefundRequestsQueue);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing waiting for review');
  });

  it('shows an error state on failure', () => {
    service.list.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(RefundRequestsQueue);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('refresh reloads the queue', () => {
    const fixture = TestBed.createComponent(RefundRequestsQueue);
    fixture.detectChanges();
    fixture.componentInstance.load();
    expect(service.list).toHaveBeenCalledTimes(2);
  });
});
