import { TestBed } from '@angular/core/testing';

import { Card } from './card';

describe('Card', () => {
  it('applies the padded class by default', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-card--padded')).toBeTruthy();
  });

  it('omits the padded class when padded is false', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('padded', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-card--padded')).toBeNull();
  });
});
