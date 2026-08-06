import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { UNAUTHENTICATED_SESSION } from './core/auth/models';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from './core/config/app-config';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG },
        {
          provide: AuthService,
          useValue: {
            session: () => UNAUTHENTICATED_SESSION,
            grantsDegradedNotice: () => false,
            loadSession: () => of(UNAUTHENTICATED_SESSION),
            logout: () => of(undefined),
          },
        },
      ],
    });
  });

  it('creates the app and hides the header while unauthenticated', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.kart-header')).toBeNull();
  });
});
