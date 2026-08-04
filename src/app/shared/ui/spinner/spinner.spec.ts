import { TestBed } from '@angular/core/testing';

import { Spinner } from './spinner';

describe('Spinner', () => {
  it('exposes its label via aria-label for assistive tech', () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput('label', 'Loading orders');
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('aria-label')).toBe('Loading orders');
  });

  it('applies the sm size class', () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-spinner--sm')).toBeTruthy();
  });
});
