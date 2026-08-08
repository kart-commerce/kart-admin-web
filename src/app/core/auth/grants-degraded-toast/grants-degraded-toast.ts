import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Button } from '../../../shared/ui';
import { AuthService } from '../auth.service';

/**
 * One-shot notice for the moment a login just completed but this principal's real grants
 * couldn't be confirmed (kart-admin-service unreachable/erroring — see
 * `adminServiceClient.listOwnGrantCategories`'s `degraded` flag). Login still succeeds either
 * way; this only tells the admin their permission-gated UI may be under-showing until they
 * reload once the service is back, rather than letting an empty-grants session look identical
 * to a genuine zero-grants principal.
 *
 * Deliberately driven by `AuthService.grantsDegradedNotice` (set only on a fresh native
 * login/MFA verify), not by `session().grantsDegraded` directly — the stored session flag
 * persists across ordinary page reloads of an already-authenticated tab, where re-showing this
 * on every refresh would be noise.
 *
 * Doesn't reuse `kart-alert` here — its `warning` variant paints its background/text from raw
 * palette tokens (`--kart-palette-warning-100`/`600`) rather than the theme-aware `--kart-color-*`
 * ones, so it never adapts for dark mode (design-system's own dark-mode-aware equivalents are
 * `--kart-color-badge-warning-bg`/`-text`, not `kart-alert`). This is a themed elevated card
 * instead — same surface/border/shadow tokens `kart-modal`/`kart-card` already use — with a
 * warning-colored accent stripe for severity instead of a fully tinted, theme-blind box.
 */
@Component({
  selector: 'kart-grants-degraded-toast',
  imports: [Button],
  templateUrl: './grants-degraded-toast.html',
  styleUrl: './grants-degraded-toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantsDegradedToast {
  protected readonly authService = inject(AuthService);

  dismiss(): void {
    this.authService.dismissGrantsDegradedNotice();
  }
}
