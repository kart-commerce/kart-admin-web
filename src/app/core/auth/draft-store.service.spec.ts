import { TestBed } from '@angular/core/testing';

import { DraftStoreService } from './draft-store.service';

describe('DraftStoreService', () => {
  let service: DraftStoreService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(DraftStoreService);
  });

  it('round-trips a saved draft', () => {
    service.save('grant-form', { principalId: 'p1', category: 'catalog-management' });
    expect(service.load('grant-form')).toEqual({ principalId: 'p1', category: 'catalog-management' });
  });

  it('returns null when nothing was saved', () => {
    expect(service.load('nonexistent')).toBeNull();
  });

  it('clear() removes the draft', () => {
    service.save('grant-form', { a: 1 });
    service.clear('grant-form');
    expect(service.load('grant-form')).toBeNull();
  });

  it('never writes under a session/token-adjacent key', () => {
    service.save('grant-form', { a: 1 });
    expect(localStorage.getItem('kart-admin-draft:grant-form')).not.toBeNull();
    expect(Object.keys(localStorage).some((k) => /session|token/i.test(k))).toBeFalse();
  });
});
