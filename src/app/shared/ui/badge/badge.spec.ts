import { TestBed } from '@angular/core/testing';

import { Badge } from './badge';

describe('Badge', () => {
  it('applies the variant class', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-badge--danger')).toBeTruthy();
  });
});
