import { TestBed } from '@angular/core/testing';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('toggles the theme on click', () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    const before = fixture.componentInstance['themeService'].theme();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance['themeService'].theme()).not.toBe(before);
  });
});
