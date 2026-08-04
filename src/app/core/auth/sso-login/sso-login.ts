import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../auth.service';

/**
 * AUTH-1: Enterprise SSO federation login (Admin role). requirement-spec.md
 * §5 — this app's Admin login is SAML/OIDC-federated, not a native password
 * form. Clicking through redirects same-origin to the BFF
 * (`AuthService.ssoLoginUrl()`), which redirects to the enterprise IdP; the
 * IdP posts back to a BFF callback route that establishes the session
 * (server/bff/routes.ts) — this component never talks to the IdP directly.
 */
@Component({
  selector: 'kart-sso-login',
  templateUrl: './sso-login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SsoLogin {
  protected readonly authService = inject(AuthService);
}
