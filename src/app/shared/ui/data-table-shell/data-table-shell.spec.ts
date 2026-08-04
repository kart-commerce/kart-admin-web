import { TestBed } from '@angular/core/testing';

import { DataTableShell } from './data-table-shell';

describe('DataTableShell', () => {
  it('shows a spinner while loading', () => {
    const fixture = TestBed.createComponent(DataTableShell);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kart-spinner')).toBeTruthy();
  });

  it('shows the error empty-state when errorMessage is set', () => {
    const fixture = TestBed.createComponent(DataTableShell);
    fixture.componentRef.setInput('errorMessage', 'Network error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Network error');
  });

  it('shows the empty empty-state when empty is true', () => {
    const fixture = TestBed.createComponent(DataTableShell);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('emptyTitle', 'No rows');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No rows');
  });

  it('projects content when not loading/error/empty', () => {
    const fixture = TestBed.createComponent(DataTableShell);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-data-table-shell__table')).toBeTruthy();
  });
});
