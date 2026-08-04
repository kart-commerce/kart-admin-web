import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.removeItem('kart-admin-theme'));

  it('toggles between light and dark and persists the choice', () => {
    const service = TestBed.inject(ThemeService);
    const initial = service.theme();
    service.toggle();
    expect(service.theme()).not.toBe(initial);
    expect(localStorage.getItem('kart-admin-theme')).toBe(service.theme());
  });

  it('setTheme() applies data-theme to the document element', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
