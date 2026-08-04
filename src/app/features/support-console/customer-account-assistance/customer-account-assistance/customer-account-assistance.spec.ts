import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CustomerAccountAssistanceService } from '../data/customer-account-assistance.service';
import { CustomerAccountAssistance } from './customer-account-assistance';

describe('CustomerAccountAssistance', () => {
  let service: jasmine.SpyObj<CustomerAccountAssistanceService>;

  const profile = {
    userId: 'user-1',
    displayName: 'Jane Doe',
    email: 'jane@example.com',
    addresses: [
      { addressId: 'addr-1', type: 'shipping' as const, line1: '1 Main St', city: 'Springfield', postalCode: '00000', countryCode: 'US', isDefault: true },
    ],
    preferences: { locale: 'en-US', currency: 'USD', marketingConsent: true },
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('CustomerAccountAssistanceService', ['getUserProfile']);
    TestBed.configureTestingModule({
      imports: [CustomerAccountAssistance],
      providers: [{ provide: CustomerAccountAssistanceService, useValue: service }],
    });
  });

  it('does nothing with an empty user ID', () => {
    const fixture = TestBed.createComponent(CustomerAccountAssistance);
    fixture.detectChanges();
    fixture.componentInstance.lookup();
    expect(service.getUserProfile).not.toHaveBeenCalled();
  });

  it('looks up and renders a profile with addresses', () => {
    service.getUserProfile.and.returnValue(of(profile));
    const fixture = TestBed.createComponent(CustomerAccountAssistance);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'user-1';
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
    expect(fixture.nativeElement.textContent).toContain('1 Main St');
  });

  it('shows an error when no account is found', () => {
    service.getUserProfile.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));
    const fixture = TestBed.createComponent(CustomerAccountAssistance);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'missing';
    fixture.componentInstance.lookup();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Not found');
  });
});
