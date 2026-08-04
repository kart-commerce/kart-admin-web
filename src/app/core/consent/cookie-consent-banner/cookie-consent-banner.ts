import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Button } from '../../../shared/ui/button/button';
import { ConsentService } from '../consent.service';
import { ALL_ACCEPTED, ALL_REJECTED } from '../consent.models';

/**
 * privacy.md §A.2 — bottom-of-viewport banner, shown on first visit (no
 * consent-version cookie yet) or when the stored version is stale (§A.4).
 * Never a full-page interstitial — never blocks the page from being
 * read/navigated before a choice is made. Three equally-prominent actions
 * (no visual weighting toward "Accept All", per several EU DPAs' equal-
 * prominence requirement). "Manage Preferences" opens the one shared
 * `CookiePreferenceCenter` instance (hosted once in `App`) via
 * `ConsentService`, rather than owning its own nested copy.
 */
@Component({
  selector: 'kart-cookie-consent-banner',
  imports: [Button],
  templateUrl: './cookie-consent-banner.html',
  styleUrl: './cookie-consent-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentBanner {
  protected readonly consentService = inject(ConsentService);

  acceptAll(): void {
    this.consentService.record(ALL_ACCEPTED);
  }

  rejectNonEssential(): void {
    this.consentService.record(ALL_REJECTED);
  }

  managePreferences(): void {
    this.consentService.openPreferenceCenter();
  }
}
