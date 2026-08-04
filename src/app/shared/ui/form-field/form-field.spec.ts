import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FormField } from './form-field';

@Component({
  imports: [FormField],
  template: `
    <kart-form-field label="Email" inputId="email" [error]="error()">
      <input id="email" type="email" />
    </kart-form-field>
  `,
})
class HostComponent {
  readonly error = signal<string | null>(null);
}

describe('FormField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('links the label to the input via for/id', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe('email');
    expect(label.textContent).toContain('Email');
  });

  it('shows the error message when set, and nothing otherwise', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-form-field__error')).toBeNull();

    fixture.componentInstance.error.set('Required.');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('.kart-form-field__error') as HTMLElement;
    expect(error.textContent).toContain('Required.');
  });
});
