import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';

import { Button } from '../../../shared/ui/button/button';
import { Modal } from '../../../shared/ui/modal/modal';
import { ConsentService } from '../consent.service';
import { ALL_REJECTED, ConsentCategories } from '../consent.models';

/**
 * privacy.md §A.3 — "a persistent, always-reachable settings surface...
 * reopens the same choice set as the banner, category-by-category toggle."
 * `Necessary` is always-on and never rendered as a toggle (GDPR/ePrivacy
 * exempts it, §A.1) — the three optional categories are toggleable even
 * though this internal tool sets none of them today, so the mechanism is
 * already correct the day it ever does. Open/closed state lives in
 * `ConsentService` (`preferenceCenterOpen`), not here, so every entry point
 * (the banner, the persistent header link) opens this one instance.
 */
@Component({
  selector: 'kart-cookie-preference-center',
  imports: [Modal, Button],
  templateUrl: './cookie-preference-center.html',
  styleUrl: './cookie-preference-center.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiePreferenceCenter {
  protected readonly consentService = inject(ConsentService);

  protected draft: ConsentCategories = ALL_REJECTED;

  constructor() {
    effect(() => {
      if (this.consentService.preferenceCenterOpen()) {
        this.draft = this.consentService.consent()?.categories ?? ALL_REJECTED;
      }
    });
  }

  toggle(category: keyof ConsentCategories): void {
    this.draft = { ...this.draft, [category]: !this.draft[category] };
  }

  save(): void {
    this.consentService.record(this.draft);
    this.consentService.closePreferenceCenter();
  }
}
