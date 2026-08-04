import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `<kart-button [variant]="variant()" [disabled]="disabled()" [loading]="loading()">Click me</kart-button>`,
})
class HostComponent {
  readonly variant = signal<ButtonVariant>('primary');
  readonly disabled = signal(false);
  readonly loading = signal(false);
}

describe('Button', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('renders the projected content', () => {
    const { button } = createHost();
    expect(button.textContent).toContain('Click me');
  });

  it('disables the native button when disabled is true', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });

  it('disables the native button and shows aria-busy when loading is true', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('kart-spinner')).toBeTruthy();
  });

  it('applies the variant class', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('danger');
    fixture.detectChanges();
    expect(button.classList).toContain('kart-button--danger');
  });
});
