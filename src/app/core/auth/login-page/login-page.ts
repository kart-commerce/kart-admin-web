import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Card } from '../../../shared/ui/card/card';
import { Logo } from '../../../shared/ui/logo/logo';
import { NativeLogin } from '../native-login/native-login';
import { SsoLogin } from '../sso-login/sso-login';

/**
 * `/login` — hosts both AUTH-1 (Admin SSO) and AUTH-2 (Support Agent native)
 * flows side by side, since this app has "one shell, role-gated sections"
 * (requirement-spec.md §6 Decision item 2) rather than two separate login
 * apps/URLs.
 */
@Component({
  selector: 'kart-login-page',
  imports: [Card, Logo, SsoLogin, NativeLogin],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
