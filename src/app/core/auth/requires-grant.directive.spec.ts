import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GrantService } from './grant.service';
import { RequiresGrant } from './requires-grant.directive';

@Component({
  imports: [RequiresGrant],
  template: `<button *kartRequiresGrant="'catalog-management'">Create product</button>`,
})
class HostComponent {}

describe('RequiresGrant', () => {
  it('renders the content when the grant is held', () => {
    const grants = signal(['catalog-management']);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: GrantService, useValue: { has: (c: string) => grants().includes(c) } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('omits the content when the grant is not held', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: GrantService, useValue: { has: () => false } }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
