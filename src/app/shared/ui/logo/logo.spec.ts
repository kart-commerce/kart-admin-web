import { TestBed } from '@angular/core/testing';

import { Logo } from './logo';

describe('Logo', () => {
  it('shows the wordmark for the full variant', () => {
    const fixture = TestBed.createComponent(Logo);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-logo__word')).toBeTruthy();
  });

  it('hides the wordmark for the mark variant', () => {
    const fixture = TestBed.createComponent(Logo);
    fixture.componentRef.setInput('variant', 'mark');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-logo__word')).toBeNull();
  });
});
