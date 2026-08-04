import { TestBed } from '@angular/core/testing';

import { ConsentService } from '../consent.service';
import { CookiePreferenceCenter } from './cookie-preference-center';

describe('CookiePreferenceCenter', () => {
  beforeEach(() => {
    // ConsentService reads `kart_consent` at construction time — clear it so
    // one spec's `record()` call can't leak into the next spec's fresh instance.
    document.cookie = 'kart_consent=; Max-Age=0; Path=/';
  });

  it('is closed until the service opens it', () => {
    const fixture = TestBed.createComponent(CookiePreferenceCenter);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens pre-filled from the current consent record when the service flips open', () => {
    const consentService = TestBed.inject(ConsentService);
    consentService.record({ analytics: true, marketing: false, preference: false });
    const fixture = TestBed.createComponent(CookiePreferenceCenter);
    fixture.detectChanges();

    consentService.openPreferenceCenter();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.componentInstance['draft'].analytics).toBeTrue();
  });

  it('toggle() flips a single category without affecting the others', () => {
    const consentService = TestBed.inject(ConsentService);
    const fixture = TestBed.createComponent(CookiePreferenceCenter);
    fixture.detectChanges();
    consentService.openPreferenceCenter();
    fixture.detectChanges();

    fixture.componentInstance.toggle('marketing');
    expect(fixture.componentInstance['draft'].marketing).toBeTrue();
    expect(fixture.componentInstance['draft'].analytics).toBeFalse();
  });

  it('save() records the draft and closes', () => {
    const consentService = TestBed.inject(ConsentService);
    const fixture = TestBed.createComponent(CookiePreferenceCenter);
    fixture.detectChanges();
    consentService.openPreferenceCenter();
    fixture.detectChanges();

    fixture.componentInstance.toggle('preference');
    fixture.componentInstance.save();

    expect(consentService.consent()?.categories.preference).toBeTrue();
    expect(consentService.preferenceCenterOpen()).toBeFalse();
  });
});
