import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RefundRequestsService } from '../../refund-requests-queue/data/refund-requests.service';
import { RefundRequestApproval } from './refund-request-approval';

describe('RefundRequestApproval', () => {
  let service: jasmine.SpyObj<RefundRequestsService>;

  const request = {
    returnRequestId: 'rr-1',
    orderId: 'order-1',
    customerId: 'user-1',
    requestedAmount: { amount: 50, currency: 'USD' },
    lineItems: [{ sku: 'SKU-1', qty: 1 }],
    status: 'Requested' as const,
    reason: 'Wrong size',
    requestedAt: '2026-01-01T00:00:00Z',
    version: 3,
  };

  function setup() {
    service = jasmine.createSpyObj('RefundRequestsService', ['get', 'approve', 'reject']);
    service.get.and.returnValue(of(request));
    TestBed.configureTestingModule({
      imports: [RefundRequestApproval],
      providers: [
        provideRouter([]),
        { provide: RefundRequestsService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ returnRequestId: 'rr-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(RefundRequestApproval);
    fixture.detectChanges();
    return fixture;
  }

  it('loads and renders the refund request detail', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Wrong size');
    expect(fixture.componentInstance['approveForm'].value.amount).toBe(50);
  });

  it('approves at the requested amount and navigates back to the queue', () => {
    const fixture = setup();
    service.approve.and.returnValue(of({ ...request, status: 'Approved' as const }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');

    fixture.componentInstance.approve();

    expect(service.approve).toHaveBeenCalledWith('rr-1', { amount: 50, currency: 'USD' }, 3);
    expect(navigateSpy).toHaveBeenCalledWith('/support-console/refund-requests');
  });

  it('rejects with a mandatory reason', () => {
    const fixture = setup();
    service.reject.and.returnValue(of({ ...request, status: 'Rejected' as const }));

    fixture.componentInstance['rejectForm'].setValue({ reason: 'Outside the return window' });
    fixture.componentInstance.reject();

    expect(service.reject).toHaveBeenCalledWith('rr-1', 'Outside the return window', 3);
  });

  it('does not reject without a reason', () => {
    const fixture = setup();
    fixture.componentInstance.reject();
    expect(service.reject).not.toHaveBeenCalled();
  });

  it('surfaces escalation-required distinctly from a generic error', () => {
    const fixture = setup();
    service.approve.and.returnValue(throwError(() => ({ error: { code: 'escalation_required', message: 'Exceeds your cap.' } })));

    fixture.componentInstance.approve();
    fixture.detectChanges();

    expect(fixture.componentInstance['escalationRequired']()).toBeTrue();
    expect(fixture.componentInstance['actionError']()).toBe('Exceeds your cap.');
  });

  it('reloads the request on an already-resolved (409) conflict', () => {
    const fixture = setup();
    service.approve.and.returnValue(throwError(() => ({ error: { code: 'already_resolved', message: 'Already resolved by another agent.' } })));

    fixture.componentInstance.approve();

    expect(service.get).toHaveBeenCalledTimes(2);
  });
});
