import { TestBed } from '@angular/core/testing';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'No products yet');
    fixture.componentRef.setInput('description', 'Create your first product to get started.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No products yet');
    expect(fixture.nativeElement.textContent).toContain('Create your first product to get started.');
  });

  it('shows the access-denied icon for the access-denied variant', () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'Access denied');
    fixture.componentRef.setInput('variant', 'access-denied');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-empty-state__icon').textContent).toContain('🔒');
  });
});
