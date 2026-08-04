import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';
import { AuthService } from '../auth/auth.service';
import { GrantService } from '../auth/grant.service';
import { UNAUTHENTICATED_SESSION } from '../auth/models';

describe('Dashboard', () => {
  it('shows the Admin sections for an Admin session', () => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => ({ ...UNAUTHENTICATED_SESSION, role: 'admin' }) } },
        { provide: GrantService, useValue: { isAdmin: () => true, isSupportAgent: () => false } },
      ],
    });
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Catalog & Inventory');
    expect(fixture.nativeElement.textContent).not.toContain('Support Console');
  });

  it('shows only the Support Console section for a Support Agent session', () => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => ({ ...UNAUTHENTICATED_SESSION, role: 'support_agent' }) } },
        { provide: GrantService, useValue: { isAdmin: () => false, isSupportAgent: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Support Console');
    expect(fixture.nativeElement.textContent).not.toContain('Catalog & Inventory');
  });
});
