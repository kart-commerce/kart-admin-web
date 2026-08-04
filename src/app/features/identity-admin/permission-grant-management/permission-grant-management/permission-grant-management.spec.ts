import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DraftStoreService } from '../../../../core/auth/draft-store.service';
import { PermissionGrantManagementService } from '../data/permission-grant-management.service';
import { PermissionGrantManagement } from './permission-grant-management';

describe('PermissionGrantManagement', () => {
  let service: jasmine.SpyObj<PermissionGrantManagementService>;

  const grants = {
    items: [
      { grantId: 'g1', principalId: 'p1', category: 'catalog-management' as const, grantedAt: '2026-01-01T00:00:00Z', grantedBy: 'admin-1', version: 1 },
    ],
    page: 1,
    pageSize: 50,
    total: 1,
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('PermissionGrantManagementService', ['list', 'issue', 'revoke']);
    service.list.and.returnValue(of(grants));
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PermissionGrantManagement],
      providers: [{ provide: PermissionGrantManagementService, useValue: service }],
    });
  });

  it('loads and renders live grants', () => {
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('p1');
    expect(fixture.nativeElement.textContent).toContain('catalog-management');
  });

  it('renders the category dropdown from GRANT_CATEGORIES, including compliance', () => {
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();
    const optionElements: Element[] = Array.from(fixture.nativeElement.querySelectorAll('option'));
    const options = optionElements.map((o) => o.textContent?.trim());
    expect(options).toContain('compliance');
  });

  it('issues a new grant and reloads, clearing the draft', () => {
    service.issue.and.returnValue(of(undefined));
    const draftStore = TestBed.inject(DraftStoreService);
    const clearSpy = spyOn(draftStore, 'clear').and.callThrough();
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();

    fixture.componentInstance['issueForm'].setValue({ principalId: 'p2', category: 'user-suspension' });
    fixture.componentInstance.issue();

    expect(service.issue).toHaveBeenCalledWith({ principalId: 'p2', category: 'user-suspension' });
    expect(clearSpy).toHaveBeenCalled();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('restores an autosaved draft on init', () => {
    const draftStore = TestBed.inject(DraftStoreService);
    draftStore.save('permission-grant-issue-form', { principalId: 'draft-user', category: 'inventory-replenishment' });
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();
    expect(fixture.componentInstance['issueForm'].value.principalId).toBe('draft-user');
  });

  it('revokes a grant after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.revoke.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();

    fixture.componentInstance.revoke(grants.items[0]);

    expect(service.revoke).toHaveBeenCalledWith('g1', 1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('shows an error state when the list fails to load', () => {
    service.list.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(PermissionGrantManagement);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });
});
