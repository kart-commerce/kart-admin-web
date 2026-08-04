import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GrantService } from '../../../../core/auth/grant.service';
import { PrivacyRequestsService } from '../../privacy-requests/data/privacy-requests.service';
import { AuditTrailService } from '../data/audit-trail.service';
import { AuditTrailViewer } from './audit-trail-viewer';

describe('AuditTrailViewer', () => {
  let auditTrailService: jasmine.SpyObj<AuditTrailService>;
  let privacyRequestsService: jasmine.SpyObj<PrivacyRequestsService>;

  const page = {
    items: [
      { actionId: 'a1', adminId: 'admin-1', category: 'catalog-management' as const, action: 'product.create', entityId: 'SKU-1', performedAt: '2026-01-01T00:00:00Z' },
    ],
    page: 1,
    pageSize: 50,
    total: 1,
  };

  beforeEach(() => {
    auditTrailService = jasmine.createSpyObj('AuditTrailService', ['list']);
    auditTrailService.list.and.returnValue(of(page));
    privacyRequestsService = jasmine.createSpyObj('PrivacyRequestsService', ['list']);
    privacyRequestsService.list.and.returnValue(of({ items: [], page: 1, pageSize: 50, total: 0 }));

    TestBed.configureTestingModule({
      imports: [AuditTrailViewer],
      providers: [
        provideRouter([]),
        { provide: AuditTrailService, useValue: auditTrailService },
        { provide: PrivacyRequestsService, useValue: privacyRequestsService },
        { provide: GrantService, useValue: { has: () => true, isAdmin: () => true, isSupportAgent: () => false } },
      ],
    });
  });

  it('loads and renders the audit trail', () => {
    const fixture = TestBed.createComponent(AuditTrailViewer);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('product.create');
  });

  it('shows an error state on failure', () => {
    auditTrailService.list.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(AuditTrailViewer);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('filters by category on submit', () => {
    const fixture = TestBed.createComponent(AuditTrailViewer);
    fixture.detectChanges();
    fixture.componentInstance['filterForm'].patchValue({ category: 'user-suspension' });
    fixture.componentInstance.load();
    expect(auditTrailService.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ category: 'user-suspension' }),
    );
  });
});
