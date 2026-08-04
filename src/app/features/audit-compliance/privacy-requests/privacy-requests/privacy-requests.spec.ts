import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PrivacyRequestsService } from '../data/privacy-requests.service';
import { PrivacyRequests } from './privacy-requests';

describe('PrivacyRequests', () => {
  it('loads and renders privacy requests', () => {
    const service = jasmine.createSpyObj('PrivacyRequestsService', ['list']);
    service.list.and.returnValue(
      of({
        items: [{ requestId: 'r1', principalId: 'user-1', type: 'erasure' as const, status: 'pending' as const, requestedAt: '2026-01-01T00:00:00Z' }],
        page: 1,
        pageSize: 50,
        total: 1,
      }),
    );
    TestBed.configureTestingModule({ imports: [PrivacyRequests], providers: [{ provide: PrivacyRequestsService, useValue: service }] });
    const fixture = TestBed.createComponent(PrivacyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('erasure');
  });

  it('shows an error state on failure', () => {
    const service = jasmine.createSpyObj('PrivacyRequestsService', ['list']);
    service.list.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    TestBed.configureTestingModule({ imports: [PrivacyRequests], providers: [{ provide: PrivacyRequestsService, useValue: service }] });
    const fixture = TestBed.createComponent(PrivacyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });
});
