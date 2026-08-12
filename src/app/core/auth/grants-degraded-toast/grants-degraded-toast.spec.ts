import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthService } from '../auth.service';
import { GrantsDegradedToast } from './grants-degraded-toast';

describe('GrantsDegradedToast', () => {
  function setup(grantsDegradedNotice: boolean) {
    const authService = {
      grantsDegradedNotice: signal(grantsDegradedNotice),
      dismissGrantsDegradedNotice: jasmine.createSpy('dismissGrantsDegradedNotice'),
    };
    TestBed.configureTestingModule({
      imports: [GrantsDegradedToast],
      providers: [{ provide: AuthService, useValue: authService }],
    });
    const fixture = TestBed.createComponent(GrantsDegradedToast);
    fixture.detectChanges();
    return { fixture, authService };
  }

  it('renders nothing when there is no notice', () => {
    const { fixture } = setup(false);
    expect(fixture.nativeElement.querySelector('.kart-grants-degraded-toast')).toBeNull();
  });

  it('shows the degraded-grants notice and dismisses it', () => {
    const { fixture, authService } = setup(true);

    expect(fixture.nativeElement.textContent).toContain("couldn't confirm your permission grants");
    (fixture.nativeElement.querySelector('.kart-grants-degraded-toast__actions button') as HTMLButtonElement).click();
    expect(authService.dismissGrantsDegradedNotice).toHaveBeenCalled();
  });
});
