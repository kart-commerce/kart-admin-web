import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AbsoluteCapWarningModal } from './core/auth/absolute-cap-warning-modal/absolute-cap-warning-modal';
import { AuthService } from './core/auth/auth.service';
import { GrantService } from './core/auth/grant.service';
import { IdleSessionService } from './core/auth/idle-session.service';
import { IdleWarningModal } from './core/auth/idle-warning-modal/idle-warning-modal';
import { ConsentService } from './core/consent/consent.service';
import { CookieConsentBanner } from './core/consent/cookie-consent-banner/cookie-consent-banner';
import { CookiePreferenceCenter } from './core/consent/cookie-preference-center/cookie-preference-center';
import { Logo, ThemeToggle } from './shared/ui';

@Component({
  selector: 'kart-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Logo,
    ThemeToggle,
    IdleWarningModal,
    AbsoluteCapWarningModal,
    CookieConsentBanner,
    CookiePreferenceCenter,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly grantService = inject(GrantService);
  protected readonly consentService = inject(ConsentService);
  private readonly idleSession = inject(IdleSessionService);

  constructor() {
    this.authService.loadSession().subscribe();

    effect(() => {
      if (this.authService.session().authenticated) {
        this.idleSession.start();
      } else {
        this.idleSession.stop();
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
