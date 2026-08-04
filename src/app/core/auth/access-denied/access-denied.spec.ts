import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  it('renders the access-denied message', () => {
    TestBed.configureTestingModule({ imports: [AccessDenied], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AccessDenied);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Access denied');
  });
});
