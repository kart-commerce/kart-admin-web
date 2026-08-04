import { TestBed } from '@angular/core/testing';

import { ConsentService } from '../consent.service';
import { CookieConsentBanner } from './cookie-consent-banner';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    // ConsentService reads `kart_consent` at construction time — clear it so
    // one spec's `record()` call can't leak into the next spec's fresh instance.
    document.cookie = 'kart_consent=; Max-Age=0; Path=/';
  });

  it('shows when no consent has been recorded yet', () => {
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-cookie-banner')).toBeTruthy();
  });

  it('hides after Accept All is clicked', () => {
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();
    fixture.componentInstance.acceptAll();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-cookie-banner')).toBeNull();
  });

  it('hides after Reject Non-Essential is clicked and records all-false', () => {
    const consentService = TestBed.inject(ConsentService);
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();
    fixture.componentInstance.rejectNonEssential();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-cookie-banner')).toBeNull();
    expect(consentService.consent()?.categories).toEqual({ analytics: false, marketing: false, preference: false });
  });

  it('managePreferences() opens the shared preference center via the service', () => {
    const consentService = TestBed.inject(ConsentService);
    const fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();

    fixture.componentInstance.managePreferences();

    expect(consentService.preferenceCenterOpen()).toBeTrue();
  });
});
