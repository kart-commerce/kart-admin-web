import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kart-admin-theme';
const THEME_COLOR: Record<Theme, string> = { light: '#2A6DF4', dark: '#0B1120' };

/**
 * Mirrors the inline bootstrap script in index.html (which sets `data-theme`
 * before first paint to avoid a flash of the wrong theme) so both agree on
 * how an initial theme is resolved: an explicit `kart-admin-theme` choice in
 * localStorage, else the OS `prefers-color-scheme`, else light.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.resolveInitialTheme());

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.applyTheme(this.theme());

    this.document.defaultView
      ?.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        if (this.readStoredTheme() === null) {
          this.updateTheme(event.matches ? 'dark' : 'light');
        }
      });
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.updateTheme(theme);
    if (this.isBrowser) {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  private updateTheme(theme: Theme): void {
    this.theme.set(theme);
    if (this.isBrowser) {
      this.applyTheme(theme);
    }
  }

  private resolveInitialTheme(): Theme {
    if (!this.isBrowser) {
      return 'light';
    }

    const attr = this.document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') {
      return attr;
    }

    return this.readStoredTheme() ?? (this.prefersDark() ? 'dark' : 'light');
  }

  private readStoredTheme(): Theme | null {
    const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  }

  private prefersDark(): boolean {
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }
}
