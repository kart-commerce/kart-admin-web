import { TestBed } from '@angular/core/testing';

import { Alert } from './alert';

describe('Alert', () => {
  it('has role="alert" for assistive tech', () => {
    const fixture = TestBed.createComponent(Alert);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('role')).toBe('alert');
  });

  it('applies the variant class', () => {
    const fixture = TestBed.createComponent(Alert);
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-alert--danger')).toBeTruthy();
  });
});
