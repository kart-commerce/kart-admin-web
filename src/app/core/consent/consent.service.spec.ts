import { TestBed } from '@angular/core/testing';

import { ConsentService } from './consent.service';
import { ALL_ACCEPTED, CONSENT_VERSION } from './consent.models';

describe('ConsentService', () => {
  beforeEach(() => {
    document.cookie = 'kart_consent=; Max-Age=0; Path=/';
  });

  it('is stale when no consent has been recorded', () => {
    const service = TestBed.inject(ConsentService);
    expect(service.isStale()).toBeTrue();
    expect(service.consent()).toBeNull();
  });

  it('record() stores the consent and clears staleness', () => {
    const service = TestBed.inject(ConsentService);
    service.record(ALL_ACCEPTED);

    expect(service.isStale()).toBeFalse();
    expect(service.consent()?.categories).toEqual(ALL_ACCEPTED);
    expect(service.consent()?.version).toBe(CONSENT_VERSION);
  });

  it('persists the record in the kart_consent cookie, read back by a fresh instance (simulated reload)', () => {
    const service = TestBed.inject(ConsentService);
    service.record(ALL_ACCEPTED);
    expect(document.cookie).toContain('kart_consent=');

    TestBed.resetTestingModule();
    const fresh = TestBed.inject(ConsentService);
    expect(fresh.consent()?.categories).toEqual(ALL_ACCEPTED);
    expect(fresh.isStale()).toBeFalse();
  });
});
