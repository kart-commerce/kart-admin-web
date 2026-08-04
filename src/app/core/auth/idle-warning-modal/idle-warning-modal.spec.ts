import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { IdleSessionService } from '../idle-session.service';
import { IdleWarningModal } from './idle-warning-modal';

describe('IdleWarningModal', () => {
  function setup(state: 'active' | 'warning' | 'expired') {
    const idleSession = {
      state: signal(state),
      warningSecondsRemaining: signal(42),
      extendSession: jasmine.createSpy('extendSession'),
    };
    TestBed.configureTestingModule({
      imports: [IdleWarningModal],
      providers: [{ provide: IdleSessionService, useValue: idleSession }],
    });
    const fixture = TestBed.createComponent(IdleWarningModal);
    fixture.detectChanges();
    return { fixture, idleSession };
  }

  it('is hidden while active', () => {
    const { fixture } = setup('active');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the countdown while in warning state', () => {
    const { fixture } = setup('warning');
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('calls extendSession() when "Stay signed in" is clicked', () => {
    const { fixture, idleSession } = setup('warning');
    (fixture.nativeElement.querySelector('.kart-modal__actions button') as HTMLButtonElement).click();
    expect(idleSession.extendSession).toHaveBeenCalled();
  });
});
